from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.tenant import get_org_resource
from ..database import get_db
from ..models.return_sale import ReturnSale as ReturnModel, ReturnItem as ReturnItemModel
from ..models.sale import Sale as SaleModel
from ..schemas.return_sale import ReturnSale, ReturnSaleCreate
from .deps import get_current_active_user, require_write_access
from ..models.user import User
from ..services.stock_service import StockService
from ..services.audit_service import AuditService

router = APIRouter()


@router.post("/", response_model=ReturnSale)
def create_return(
    *,
    db: Session = Depends(get_db),
    return_in: ReturnSaleCreate,
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
) -> Any:
    sale = get_org_resource(db, SaleModel, org.id, return_in.sale_id)
    db_obj = ReturnModel(
        organization_id=org.id,
        sale_id=sale.id,
        reason=return_in.reason,
        user_id=current_user.id,
    )
    db.add(db_obj)
    db.flush()
    returned_items_info = []
    for item in return_in.items:
        db.add(ReturnItemModel(return_id=db_obj.id, product_id=item.product_id, quantity=item.quantity))
        StockService.increase_stock(
            db=db,
            product_id=item.product_id,
            quantity=item.quantity,
            reason=f"Devolución Venta #{sale.id}: {return_in.reason}",
            organization_id=org.id,
            reference_type="return",
            reference_id=db_obj.id,
            user_id=current_user.id,
        )
        returned_items_info.append({"product_id": item.product_id, "qty": item.quantity})
    db.commit()
    db.refresh(db_obj)
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        organization_id=org.id,
        entity="devolucion",
        entity_id=db_obj.id,
        action="crear",
        changes={"sale_id": sale.id, "reason": return_in.reason, "items": returned_items_info},
    )
    return db_obj


@router.get("/", response_model=List[ReturnSale])
def read_returns(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return (
        db.query(ReturnModel)
        .filter(ReturnModel.organization_id == current_user.organization_id)
        .offset(skip)
        .limit(limit)
        .all()
    )
