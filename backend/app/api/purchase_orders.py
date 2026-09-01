from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from ..core.tenant import get_org_resource
from ..database import get_db
from ..schemas import PurchaseOrder as PurchaseOrderSchema, PurchaseOrderCreate, PurchaseOrderReceive
from ..models import PurchaseOrder, PurchaseOrderItem, User, ProductSupplier, Product, Supplier
from ..services import StockService, AuditService
from .deps import get_current_active_user, require_write_access

router = APIRouter()


@router.get("/", response_model=List[PurchaseOrderSchema])
def get_purchase_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.organization_id == current_user.organization_id)
        .order_by(PurchaseOrder.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{po_id}", response_model=PurchaseOrderSchema)
def get_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return get_org_resource(db, PurchaseOrder, current_user.organization_id, po_id)


@router.post("/", response_model=PurchaseOrderSchema, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    po: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
):
    get_org_resource(db, Supplier, org.id, po.supplier_id)
    for item in po.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Las cantidades deben ser mayores a 0")
        get_org_resource(db, Product, org.id, item.product_id)

    allowed_product_ids = [
        ps.product_id
        for ps in db.query(ProductSupplier).filter(ProductSupplier.supplier_id == po.supplier_id).all()
    ]
    for item in po.items:
        if item.product_id not in allowed_product_ids:
            raise HTTPException(
                status_code=400,
                detail=f"El producto ID {item.product_id} no pertenece al catálogo de este proveedor",
            )

    total = sum(item.quantity * item.unit_cost for item in po.items)
    db_po = PurchaseOrder(
        organization_id=org.id,
        supplier_id=po.supplier_id,
        total=total,
        notes=po.notes,
        status="pending",
        payment_method=po.payment_method,
        due_date=po.due_date,
        is_paid=po.is_paid,
    )
    db.add(db_po)
    db.flush()
    for item in po.items:
        db.add(
            PurchaseOrderItem(
                purchase_order_id=db_po.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
            )
        )
    db.commit()
    db.refresh(db_po)
    AuditService.log_action(
        db=db,
        entity="orden_compra",
        entity_id=db_po.id,
        action="crear",
        organization_id=org.id,
        user_id=current_user.id,
        changes={"total": db_po.total, "items_count": len(db_po.items)},
    )
    return db_po


@router.patch("/{po_id}/toggle-payment", response_model=PurchaseOrderSchema)
def toggle_payment_status(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
):
    po = get_org_resource(db, PurchaseOrder, org.id, po_id)
    po.is_paid = not po.is_paid
    db.commit()
    db.refresh(po)
    AuditService.log_action(
        db=db,
        entity="orden_compra",
        entity_id=po.id,
        action="actualizar_pago",
        organization_id=org.id,
        user_id=current_user.id,
        changes={"is_paid": po.is_paid},
    )
    return po


@router.patch("/{po_id}/receive", response_model=PurchaseOrderSchema)
def receive_purchase_order(
    po_id: int,
    reception_data: PurchaseOrderReceive,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
):
    po = get_org_resource(db, PurchaseOrder, org.id, po_id)
    if po.status == "completado":
        raise HTTPException(status_code=400, detail="Orden ya está completamente recibida")
    try:
        po_items = {item.id: item for item in po.items}
        for recv_item in reception_data.items:
            if recv_item.item_id not in po_items:
                raise HTTPException(status_code=400, detail=f"Item ID {recv_item.item_id} no pertenece a esta orden")
            item = po_items[recv_item.item_id]
            pending = item.quantity - item.received_quantity
            if recv_item.received_quantity > pending:
                raise HTTPException(status_code=400, detail=f"Cantidad excede el saldo pendiente ({pending})")
            item.received_quantity += recv_item.received_quantity
            StockService.increase_stock(
                db=db,
                product_id=item.product_id,
                quantity=recv_item.received_quantity,
                reason=f"Recibido parcial de OC #{po_id}",
                organization_id=org.id,
                reference_type="purchase_order",
                reference_id=po_id,
                user_id=current_user.id,
            )
        all_completed = all(item.received_quantity >= item.quantity for item in po.items)
        po.status = "completado" if all_completed else "parcial"
        po.received_at = datetime.now()
        db.commit()
        db.refresh(po)
        AuditService.log_action(
            db=db,
            entity="orden_compra",
            entity_id=po.id,
            action="recibir",
            organization_id=org.id,
            user_id=current_user.id,
            changes={"status": po.status},
        )
        return po
    except HTTPException:
        db.rollback()
        raise
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error receiving order: {str(e)}")


@router.delete("/{po_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
):
    po = get_org_resource(db, PurchaseOrder, org.id, po_id)
    AuditService.log_action(
        db=db,
        entity="orden_compra",
        entity_id=po.id,
        action="eliminar",
        organization_id=org.id,
        user_id=current_user.id,
    )
    db.delete(po)
    db.commit()
