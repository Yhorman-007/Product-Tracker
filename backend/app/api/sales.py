from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas import Sale as SaleSchema, SaleCreate
from ..models import Sale, SaleItem, Product
from ..services import StockService, ProfitService, AuditService
from .deps import get_current_active_user
from ..models import User

router = APIRouter()

# Este endpoint obtiene el historial de ventas paginado
@router.get("/", response_model=List[SaleSchema])
def get_sales(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Obtener todas las ventas registradas (RF07, RF43)
    """
    sales = db.query(Sale).order_by(Sale.created_at.desc()).offset(skip).limit(limit).all()
    return sales

# Este endpoint obtiene el detalle completo de una venta específica por su ID
@router.get("/{sale_id}", response_model=SaleSchema)
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    """
    Obtener detalle exacto de la venta solicitada por ID
    """
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale

# Este endpoint registra una nueva venta, calcula totales y reduce el stock automáticamente
@router.post("/", response_model=SaleSchema, status_code=status.HTTP_201_CREATED)
def create_sale(
    sale: SaleCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Registrar una venta e inducir una deducción de inventario automática (RF41, RF43)
    """
    try:
        # Iniciar el calculo del total de la venta
        total = 0
        sale_items_data = []
        
        for item in sale.items:
            # Verificar que este producto existe y coincide en base de datos
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
            # No permitir ventas si stock es 0 o insuficiente
            if product.stock <= 0:
                raise HTTPException(status_code=400, detail=f"No hay stock disponible de {product.name}")
            if item.quantity > product.stock:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente de {product.name}. Disponible: {product.stock}, solicitado: {item.quantity}")
            if item.quantity <= 0:
                raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")
            
            # Calcular el subtotal sumando cada unidad pagada (Cantidad x Precio)
            subtotal = item.quantity * item.unit_price
            total += subtotal
            
            sale_items_data.append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "subtotal": subtotal
            })
        
        # Restar los montos de descuentos o promociones aplicadas en la pasarela
        total -= sale.discount
        
        # Instanciar tabla maestra de cabecera en BD
        db_sale = Sale(
            total=total,
            discount=sale.discount,
            payment_method=sale.payment_method,
            client_id=sale.client_id
        )
        db.add(db_sale)
        db.flush()  # Obtener el ID temporal de la venta instanciada
        
        # Crear objetos dependientes de detalle y emitir alerta de deducción de stock (RF41)
        for item_data in sale_items_data:
            # Crear el registro por cada elemento individual vendido
            sale_item = SaleItem(
                sale_id=db_sale.id,
                **item_data
            )
            db.add(sale_item)
            
            # Reducir stock valiéndose de los servicios estáticos del sistema
            StockService.reduce_stock(
                db=db,
                product_id=item_data["product_id"],
                quantity=item_data["quantity"],
                reason="Venta",
                reference_type="sale",
                reference_id=db_sale.id
            )
        
        db.commit()
        db.refresh(db_sale)
        
        # Historial de Auditoría
        AuditService.log_action(
            db=db,
            entity="venta",
            entity_id=db_sale.id,
            action="crear",
            user_id=current_user.id,
            changes={
                "total": db_sale.total,
                "items_count": len(db_sale.items),
                "client_id": db_sale.client_id
            }
        )
        
        return db_sale
        
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating sale: {str(e)}")

# Este endpoint calcula la ganancia bruta total de todas las ventas
@router.get("/profit/total", response_model=dict)
def get_total_profit(db: Session = Depends(get_db)):
    """
    Calcular la rentabilidad y ganancia bruta total de los activos (RF08)
    """
    return ProfitService.calculate_total_profit(db)

# Este endpoint calcula la ganancia bruta específica de un único producto
@router.get("/profit/{product_id}", response_model=dict)
def get_product_profit(product_id: int, db: Session = Depends(get_db)):
    """
    Calcular el margen bruto comercial y ganancia para un artículo específico (RF08)
    """
    try:
        return ProfitService.calculate_product_profit(db, product_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
