from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.return_sale import ReturnSale as ReturnModel, ReturnItem as ReturnItemModel
from ..models.sale import Sale as SaleModel
from ..schemas.return_sale import ReturnSale, ReturnSaleCreate
from .deps import get_current_active_user
from ..models.user import User
from ..services.stock_service import StockService
from ..services.audit_service import AuditService

router = APIRouter()

# Este endpoint procesa una devolución de venta real, restaurando el stock del producto devuelto
@router.post("/", response_model=ReturnSale)
def create_return(
    *,
    db: Session = Depends(get_db),
    return_in: ReturnSaleCreate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Create a new return and restore stock.
    """
    # Verify sale exists
    sale = db.query(SaleModel).filter(SaleModel.id == return_in.sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    # Create return record
    db_obj = ReturnModel(
        sale_id=return_in.sale_id,
        reason=return_in.reason,
        user_id=current_user.id
    )
    db.add(db_obj)
    db.flush()

    returned_items_info = []

    for item in return_in.items:
        # Check if item was part of the sale (optional but recommended)
        # For simplicity, we assume the frontend sends valid data
        
        # Create return item record
        return_item = ReturnItemModel(
            return_id=db_obj.id,
            product_id=item.product_id,
            quantity=item.quantity
        )
        db.add(return_item)

        # Restore stock using StockService
        StockService.increase_stock(
            db=db,
            product_id=item.product_id,
            quantity=item.quantity,
            reason=f"Devolución Venta #{sale.id}: {return_in.reason}",
            reference_type="return",
            reference_id=db_obj.id,
            user_id=current_user.id
        )
        
        returned_items_info.append({"product_id": item.product_id, "qty": item.quantity})

    db.commit()
    db.refresh(db_obj)

    # Log action
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        entity="devolucion",
        entity_id=db_obj.id,
        action="crear",
        changes={
            "sale_id": sale.id,
            "reason": return_in.reason,
            "items": returned_items_info
        }
    )

    return db_obj

# Este endpoint devuelve en forma de lista paginada todas las devoluciones históricas
@router.get("/", response_model=List[ReturnSale])
def read_returns(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Retrieve returns.
    """
    returns = db.query(ReturnModel).offset(skip).limit(limit).all()
    return returns
