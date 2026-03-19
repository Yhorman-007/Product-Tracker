from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ..database import get_db
from ..schemas import PurchaseOrder as PurchaseOrderSchema, PurchaseOrderCreate, PurchaseOrderReceive
from ..models import PurchaseOrder, PurchaseOrderItem, User, ProductSupplier
from ..services import StockService, AuditService
from .deps import get_current_active_user

router = APIRouter()

# Este endpoint obtiene el historial paginado de todas las órdenes de compra emitidas
@router.get("/", response_model=List[PurchaseOrderSchema])
def get_purchase_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Consultar flujo de órdenes de compra"""
    pos = db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()
    return pos

# Este endpoint consulta el máximo detalle de una orden de compra usando su ID único
@router.get("/{po_id}", response_model=PurchaseOrderSchema)
def get_purchase_order(po_id: int, db: Session = Depends(get_db)):
    """Localizar una orden por su número de control"""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po

# Este endpoint registra una nueva orden de compra, verificando que los productos correspondan al proveedor seleccionado
@router.post("/", response_model=PurchaseOrderSchema, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    po: PurchaseOrderCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Emitir o levantar una nueva orden de compra"""
    # Validar cantidades no negativas
    for item in po.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Las cantidades deben ser mayores a 0")
    # Validar que los productos pertenecen al catálogo del proveedor
    allowed_product_ids = [ps.product_id for ps in db.query(ProductSupplier).filter(ProductSupplier.supplier_id == po.supplier_id).all()]
    
    for item in po.items:
        if item.product_id not in allowed_product_ids:
            raise HTTPException(
                status_code=400, 
                detail=f"El producto ID {item.product_id} no pertenece al catálogo de este proveedor"
            )

    # Calcular coste de las partidas
    total = sum(item.quantity * item.unit_cost for item in po.items)
    
    # Create PO
    db_po = PurchaseOrder(
        supplier_id=po.supplier_id,
        total=total,
        notes=po.notes,
        status="pending",
        payment_method=po.payment_method,
        due_date=po.due_date,
        is_paid=po.is_paid
    )
    db.add(db_po)
    db.flush()
    
    # Guardar items de la orden
    for item in po.items:
        po_item = PurchaseOrderItem(
            purchase_order_id=db_po.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost
        )
        db.add(po_item)
    
    db.commit()
    db.refresh(db_po)
    
    # Audit Log
    AuditService.log_action(
        db=db,
        entity="orden_compra",
        entity_id=db_po.id,
        action="crear",
        user_id=current_user.id,
        changes={
            "total": db_po.total, 
            "items_count": len(db_po.items),
            "name": db_po.supplier.name if db_po.supplier else f"Proveedor #{db_po.supplier_id}"
        }
    )
    
    return db_po

# Este endpoint funciona como un interruptor ("Toggle") para cambiar rápidamente el estado de pagado a no-pagado (y viceversa) de la orden
@router.patch("/{po_id}/toggle-payment", response_model=PurchaseOrderSchema)
def toggle_payment_status(
    po_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Alternar el indicador (is_paid) de la órden de compra (RF40)
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Intercambiar estado booleano
    po.is_paid = not po.is_paid
    
    db.commit()
    db.refresh(po)
    
    # Audit Log
    AuditService.log_action(
        db=db,
        entity="orden_compra",
        entity_id=po.id,
        action="actualizar_pago",
        user_id=current_user.id,
        changes={"is_paid": po.is_paid}
    )
    
    return po

# Este endpoint registra el recibimiento parcial o total de la orden, ajustando el stock del inventario automáticamente
@router.patch("/{po_id}/receive", response_model=PurchaseOrderSchema)
def receive_purchase_order(
    po_id: int, 
    reception_data: PurchaseOrderReceive,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Registrar ingreso parcial de artículos a una orden (RF36 - Recepción Parcial)
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if po.status == "completado":
        raise HTTPException(status_code=400, detail="Orden ya está completamente recibida")
    
    try:
        # Mapear los articulos de la orden para referenciación rápida
        po_items = {item.id: item for item in po.items}
        
        # Procesar lote recibido contra lo solicitado
        for recv_item in reception_data.items:
            if recv_item.item_id not in po_items:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Item ID {recv_item.item_id} no pertenece a esta orden"
                )
            
            item = po_items[recv_item.item_id]
            pending = item.quantity - item.received_quantity
            
            if recv_item.received_quantity > pending:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cantidad para {item.product.name} excede el saldo pendiente ({pending})"
                )
            
            # Acreditar unidades recibidas a la partida
            item.received_quantity += recv_item.received_quantity
            
            # Reflejar ingresos en bodega
            StockService.increase_stock(
                db=db,
                product_id=item.product_id,
                quantity=recv_item.received_quantity,
                reason=f"Recibido parcial de OC #{po_id}",
                reference_type="purchase_order",
                reference_id=po_id,
                user_id=current_user.id
            )
        
        # Validar si este recibo cierra por completo la orden o no
        all_completed = all(item.received_quantity >= item.quantity for item in po.items)
        po.status = "completado" if all_completed else "parcial"
        po.received_at = datetime.now()
        
        db.commit()
        db.refresh(po)
        
        # Historial de Auditoría
        AuditService.log_action(
            db=db,
            entity="orden_compra",
            entity_id=po.id,
            action="recibir",
            user_id=current_user.id,
            changes={"status": po.status}
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


# Este endpoint suprime completamente del sistema una orden de compra
@router.delete("/{po_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase_order(
    po_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Eliminar orden de compra del historial (solo manualmente por el usuario)"""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    # Audit Log
    AuditService.log_action(
        db=db,
        entity="orden_compra",
        entity_id=po.id,
        action="eliminar",
        user_id=current_user.id
    )
    
    db.delete(po)
    db.commit()
