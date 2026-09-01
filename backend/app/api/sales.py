from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..core.tenant import get_org_resource
from ..database import get_db
from ..schemas import Sale as SaleSchema, SaleCreate
from ..models import Sale, SaleItem, Product, User
from ..services import StockService, ProfitService, AuditService
from .deps import get_current_active_user, require_write_access

router = APIRouter()


@router.get("/", response_model=List[SaleSchema])
def get_sales(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return (
        db.query(Sale)
        .filter(Sale.organization_id == current_user.organization_id)
        .order_by(Sale.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/profit/total", response_model=dict)
def get_total_profit(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return ProfitService.calculate_total_profit(db, current_user.organization_id)


@router.get("/profit/{product_id}", response_model=dict)
def get_product_profit(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        return ProfitService.calculate_product_profit(db, product_id, current_user.organization_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{sale_id}", response_model=SaleSchema)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return get_org_resource(db, Sale, current_user.organization_id, sale_id)


@router.post("/", response_model=SaleSchema, status_code=status.HTTP_201_CREATED)
def create_sale(
    sale: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
):
    try:
        total = 0
        sale_items_data = []
        org_id = org.id

        for item in sale.items:
            product = (
                db.query(Product)
                .filter(Product.id == item.product_id, Product.organization_id == org_id)
                .first()
            )
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
            if product.stock <= 0:
                raise HTTPException(status_code=400, detail=f"No hay stock disponible de {product.name}")
            if item.quantity > product.stock:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente de {product.name}. Disponible: {product.stock}",
                )
            if item.quantity <= 0:
                raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")

            subtotal = item.quantity * item.unit_price
            total += subtotal
            sale_items_data.append(
                {
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "subtotal": subtotal,
                }
            )

        total -= sale.discount
        db_sale = Sale(
            organization_id=org_id,
            total=total,
            discount=sale.discount,
            payment_method=sale.payment_method,
            client_id=sale.client_id,
            user_id=current_user.id,
        )
        db.add(db_sale)
        db.flush()

        for item_data in sale_items_data:
            db.add(SaleItem(sale_id=db_sale.id, **item_data))
            StockService.reduce_stock(
                db=db,
                product_id=item_data["product_id"],
                quantity=item_data["quantity"],
                reason="Venta",
                organization_id=org_id,
                reference_type="sale",
                reference_id=db_sale.id,
                user_id=current_user.id,
            )

        db.commit()
        db.refresh(db_sale)
        AuditService.log_action(
            db=db,
            entity="venta",
            entity_id=db_sale.id,
            action="crear",
            organization_id=org_id,
            user_id=current_user.id,
            changes={
                "total": db_sale.total,
                "items_count": len(db_sale.items),
                "client_id": db_sale.client_id,
            },
        )
        return db_sale
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating sale: {str(e)}")
