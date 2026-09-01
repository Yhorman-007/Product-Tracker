from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.tenant import get_org_resource
from ..database import get_db
from ..models import StockMovement as StockMovementModel, Product, User
from ..schemas.stock_movement import StockMovement, StockMovementCreate
from .deps import get_current_active_user, require_write_access

router = APIRouter()


@router.post("/", response_model=StockMovement)
def create_stock_movement(
    *,
    db: Session = Depends(get_db),
    movement_in: StockMovementCreate,
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
) -> Any:
    product = get_org_resource(db, Product, org.id, movement_in.product_id)
    m_type = movement_in.type.upper()
    if m_type in ["EXIT", "SALE"] and product.stock < movement_in.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stock insuficiente. Disponible: {product.stock}",
        )
    if m_type in ["ENTRY", "RETURN"]:
        product.stock += movement_in.quantity
    else:
        product.stock -= movement_in.quantity
    db_obj = StockMovementModel(
        organization_id=org.id,
        product_id=movement_in.product_id,
        type=m_type,
        quantity=movement_in.quantity,
        reason=movement_in.reason,
        user_id=current_user.id,
        reference_type=movement_in.reference_type,
        reference_id=movement_in.reference_id,
    )
    db.add(product)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.get("/", response_model=List[StockMovement])
def get_all_stock_movements(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return (
        db.query(StockMovementModel)
        .filter(StockMovementModel.organization_id == current_user.organization_id)
        .order_by(StockMovementModel.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{product_id}", response_model=List[StockMovement])
def read_stock_movements(
    product_id: int,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    get_org_resource(db, Product, current_user.organization_id, product_id)
    return (
        db.query(StockMovementModel)
        .filter(
            StockMovementModel.organization_id == current_user.organization_id,
            StockMovementModel.product_id == product_id,
        )
        .order_by(StockMovementModel.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
