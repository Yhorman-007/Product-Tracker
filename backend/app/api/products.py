from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..core.plans import get_plan_limits
from ..core.tenant import get_org_resource
from ..database import get_db
from ..schemas import Product as ProductSchema, ProductCreate, ProductUpdate
from ..models import Product, User, ProductSupplier
from ..models.stock_movement import StockMovement
from ..services import AlertService, AuditService
from .deps import get_current_active_user, get_current_organization, require_write_access

router = APIRouter()


def _product_query(db: Session, org_id: int):
    return db.query(Product).filter(Product.organization_id == org_id, Product.archived == False)


@router.get("/", response_model=List[ProductSchema])
def get_products(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock: Optional[bool] = False,
    current_user: User = Depends(get_current_active_user),
):
    query = _product_query(db, current_user.organization_id)
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) | (Product.sku.ilike(f"%{search}%"))
        )
    if category:
        query = query.filter(Product.category == category)
    if low_stock:
        query = query.filter(Product.stock <= Product.min_stock)
    return query.offset(skip).limit(limit).all()


@router.get("/alerts/low-stock", response_model=List[dict])
def get_low_stock_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return AlertService.get_low_stock_alerts(db, current_user.organization_id)


@router.get("/alerts/expiring", response_model=List[dict])
def get_expiring_products(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return AlertService.get_expiring_products(db, current_user.organization_id, days)


@router.get("/{product_id}", response_model=ProductSchema)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return get_org_resource(db, Product, current_user.organization_id, product_id)


@router.post("/", response_model=ProductSchema, status_code=status.HTTP_201_CREATED)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
):
    limits = get_plan_limits(org.plan)
    count = db.query(Product).filter(Product.organization_id == org.id).count()
    if count >= limits.max_products:
        raise HTTPException(status_code=402, detail="Product limit reached for your plan")

    existing = (
        db.query(Product)
        .filter(Product.organization_id == org.id, Product.sku == product.sku)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail=f"Product with SKU {product.sku} already exists")

    supplier_id = product.supplier_id
    product_data = product.model_dump(exclude={"supplier_id"})
    db_product = Product(**product_data, organization_id=org.id)
    db.add(db_product)
    db.flush()

    if supplier_id:
        db.add(
            ProductSupplier(
                product_id=db_product.id,
                supplier_id=supplier_id,
                cost_price_by_supplier=db_product.price_purchase,
            )
        )

    if db_product.stock > 0:
        db.add(
            StockMovement(
                organization_id=org.id,
                product_id=db_product.id,
                type="IN",
                quantity=db_product.stock,
                reason=f"Stock inicial al crear producto '{db_product.name}'",
                user_id=current_user.id,
                reference_type="product_create",
                reference_id=db_product.id,
            )
        )

    AuditService.log_action(
        db=db,
        entity="producto",
        entity_id=db_product.id,
        action="crear",
        organization_id=org.id,
        user_id=current_user.id,
        changes=product.model_dump(mode="json"),
    )
    db.commit()
    db.refresh(db_product)
    return db_product


@router.put("/{product_id}", response_model=ProductSchema)
def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
):
    product = get_org_resource(db, Product, org.id, product_id)
    update_fields = product_update.model_dump(exclude_unset=True, exclude={"supplier_id"}).keys()
    old_values = {field: getattr(product, field) for field in update_fields}
    update_data = product_update.model_dump(exclude_unset=True)
    supplier_id = update_data.pop("supplier_id", None)

    for field, value in update_data.items():
        setattr(product, field, value)

    if supplier_id:
        existing_assoc = (
            db.query(ProductSupplier)
            .filter(ProductSupplier.product_id == product.id, ProductSupplier.supplier_id == supplier_id)
            .first()
        )
        if not existing_assoc:
            db.add(
                ProductSupplier(
                    product_id=product.id,
                    supplier_id=supplier_id,
                    cost_price_by_supplier=product.price_purchase,
                )
            )

    db.flush()
    new_stock = update_data.get("stock")
    if new_stock is not None and "stock" in old_values and new_stock != old_values["stock"]:
        delta = new_stock - old_values["stock"]
        db.add(
            StockMovement(
                organization_id=org.id,
                product_id=product.id,
                type="IN" if delta > 0 else "OUT",
                quantity=abs(delta),
                reason=f"Ajuste manual de stock ({old_values['stock']} → {new_stock})",
                user_id=current_user.id,
                reference_type="product_update",
                reference_id=product.id,
            )
        )

    AuditService.log_action(
        db=db,
        entity="producto",
        entity_id=product.id,
        action="actualizar",
        organization_id=org.id,
        user_id=current_user.id,
        changes={
            "nombre_actual": product.name,
            **{
                field: {"old": old_values[field], "new": value}
                for field, value in update_data.items()
                if field in old_values
            },
        },
    )
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
):
    product = get_org_resource(db, Product, org.id, product_id)
    try:
        p_id, p_name = product.id, product.name
        db.delete(product)
        AuditService.log_action(
            db=db,
            entity="producto",
            entity_id=p_id,
            action="eliminar",
            organization_id=org.id,
            user_id=current_user.id,
            changes={"nombre": p_name},
        )
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar el producto porque tiene historial. Archívelo en su lugar.",
        )
    return None


@router.patch("/{product_id}/archive", response_model=ProductSchema)
def archive_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
):
    product = get_org_resource(db, Product, org.id, product_id)
    product.archived = not product.archived
    AuditService.log_action(
        db=db,
        entity="producto",
        entity_id=product.id,
        action="archivar" if product.archived else "desarchivar",
        organization_id=org.id,
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(product)
    return product
