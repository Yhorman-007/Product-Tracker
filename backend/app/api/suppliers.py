from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..core.tenant import get_org_resource
from ..database import get_db
from ..schemas import (
    Supplier as SupplierSchema,
    SupplierCreate,
    SupplierUpdate,
    ProductSupplier as ProductSupplierSchema,
    ProductSupplierCreate,
)
from ..models import Supplier, ProductSupplier, Product, User
from ..services import AuditService
from .deps import get_current_active_user, require_write_access

router = APIRouter()


@router.get("/", response_model=List[SupplierSchema])
def get_suppliers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return (
        db.query(Supplier)
        .filter(Supplier.organization_id == current_user.organization_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{supplier_id}", response_model=SupplierSchema)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return get_org_resource(db, Supplier, current_user.organization_id, supplier_id)


@router.post("/", response_model=SupplierSchema, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
):
    db_supplier = Supplier(**supplier.model_dump(), organization_id=org.id)
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    AuditService.log_action(
        db=db,
        entity="proveedor",
        entity_id=db_supplier.id,
        action="crear",
        organization_id=org.id,
        user_id=current_user.id,
        changes={"name": db_supplier.name},
    )
    return db_supplier


@router.put("/{supplier_id}", response_model=SupplierSchema)
def update_supplier(
    supplier_id: int,
    supplier_update: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
):
    supplier = get_org_resource(db, Supplier, org.id, supplier_id)
    update_data = supplier_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    AuditService.log_action(
        db=db,
        entity="proveedor",
        entity_id=supplier.id,
        action="actualizar",
        organization_id=org.id,
        user_id=current_user.id,
        changes={k: {"old": getattr(supplier, k), "new": v} for k, v in update_data.items()},
    )
    return supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
):
    supplier = get_org_resource(db, Supplier, org.id, supplier_id)
    AuditService.log_action(
        db=db,
        entity="proveedor",
        entity_id=supplier.id,
        action="eliminar",
        organization_id=org.id,
        user_id=current_user.id,
        changes={"name": supplier.name},
    )
    db.delete(supplier)
    db.commit()
    return None


@router.get("/{supplier_id}/catalogue", response_model=List[ProductSupplierSchema])
def get_supplier_catalogue(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    get_org_resource(db, Supplier, current_user.organization_id, supplier_id)
    return db.query(ProductSupplier).filter(ProductSupplier.supplier_id == supplier_id).all()


@router.post("/{supplier_id}/catalogue", response_model=ProductSupplierSchema)
def add_to_catalogue(
    supplier_id: int,
    item: ProductSupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
):
    get_org_resource(db, Supplier, org.id, supplier_id)
    product = get_org_resource(db, Product, org.id, item.product_id)
    existing = (
        db.query(ProductSupplier)
        .filter(ProductSupplier.supplier_id == supplier_id, ProductSupplier.product_id == item.product_id)
        .first()
    )
    if existing:
        existing.cost_price_by_supplier = item.cost_price_by_supplier
        db.commit()
        db.refresh(existing)
        return existing
    db_item = ProductSupplier(
        supplier_id=supplier_id,
        product_id=product.id,
        cost_price_by_supplier=item.cost_price_by_supplier,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.delete("/{supplier_id}/catalogue/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_catalogue(
    supplier_id: int,
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    get_org_resource(db, Supplier, current_user.organization_id, supplier_id)
    get_org_resource(db, Product, current_user.organization_id, product_id)
    db_item = (
        db.query(ProductSupplier)
        .filter(ProductSupplier.supplier_id == supplier_id, ProductSupplier.product_id == product_id)
        .first()
    )
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found in catalogue")
    db.delete(db_item)
    db.commit()
    return None
