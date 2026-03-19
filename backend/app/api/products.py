from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..schemas import Product as ProductSchema, ProductCreate, ProductUpdate
from ..models import Product, User, ProductSupplier
from ..models.stock_movement import StockMovement
from ..services import AlertService, AuditService
from .deps import get_current_active_user

router = APIRouter()

# Este endpoint obtiene la lista de productos y permite aplicar filtros (búsqueda, categoría, bajo stock)
@router.get("/", response_model=List[ProductSchema])
def get_products(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock: Optional[bool] = False
):
    """
    Recuperar productos con sus filtros (RF04, RF03)
    """
    query = db.query(Product).filter(Product.archived == False)
    
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) | 
            (Product.sku.ilike(f"%{search}%"))
        )
    
    if category:
        query = query.filter(Product.category == category)
        
    if low_stock:
        query = query.filter(Product.stock <= Product.min_stock)
        
    return query.offset(skip).limit(limit).all()

# Este endpoint recupera un producto específico usando su ID
@router.get("/{product_id}", response_model=ProductSchema)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """
    Obtener producto por ID (RF02)
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

# Este endpoint crea un nuevo producto, asocia proveedores si aplica y registra el stock inicial
@router.post("/", response_model=ProductSchema, status_code=status.HTTP_201_CREATED)
def create_product(
    product: ProductCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Crear nuevo producto (RF03)
    """
    # Verificar si el SKU ya existe en la base de datos
    existing = db.query(Product).filter(Product.sku == product.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product with SKU {product.sku} already exists")
    
    # Extraer el supplier_id (proveedor) si está presente
    supplier_id = product.supplier_id
    product_data = product.model_dump(exclude={"supplier_id"})
    
    db_product = Product(**product_data)
    db.add(db_product)
    db.flush()
    
    # Si se proporcionó un supplier_id, se crea la asociación en ProductSupplier
    if supplier_id:
        db_association = ProductSupplier(
            product_id=db_product.id,
            supplier_id=supplier_id,
            cost_price_by_supplier=db_product.price_purchase
        )
        db.add(db_association)
    
    # Registrar un movimiento de entrada de stock de forma automática si la cantidad > 0
    if db_product.stock > 0:
        movement = StockMovement(
            product_id=db_product.id,
            type="IN",
            quantity=db_product.stock,
            reason=f"Stock inicial al crear producto '{db_product.name}'",
            user_id=current_user.id,
            reference_type="product_create",
            reference_id=db_product.id
        )
        db.add(movement)

    # Historial de Auditoría
    AuditService.log_action(
        db=db,
        entity="producto",
        entity_id=db_product.id,
        action="crear",
        user_id=current_user.id,
        changes=product.model_dump(mode='json')
    )
    
    db.commit()
    db.refresh(db_product)
    return db_product

# Este endpoint actualiza la información de un producto existente y registra auditoría
@router.put("/{product_id}", response_model=ProductSchema)
def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Actualizar información de un producto (RF04)
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Capturar los valores antiguos para el registro de auditoría (excluyendo supplier_id del acceso directo al modelo)
    update_fields = product_update.model_dump(exclude_unset=True, exclude={"supplier_id"}).keys()
    old_values = {field: getattr(product, field) for field in update_fields}
    
    # Actualizar solo los campos que han sido alterados en la solicitud
    update_data = product_update.model_dump(exclude_unset=True)
    supplier_id = update_data.pop("supplier_id", None)
    
    for field, value in update_data.items():
        setattr(product, field, value)
    
    if supplier_id:
        # Comprobar si la asociación Producto-Proveedor ya existe
        existing_assoc = db.query(ProductSupplier).filter(
            ProductSupplier.product_id == product.id,
            ProductSupplier.supplier_id == supplier_id
        ).first()
        if not existing_assoc:
            db_association = ProductSupplier(
                product_id=product.id,
                supplier_id=supplier_id,
                cost_price_by_supplier=product.price_purchase
            )
            db.add(db_association)
    
    db.flush()
    
    # Auto-registrar un movimiento de stock en caso de que este haya cambiado manualmente
    new_stock = update_data.get("stock")
    if new_stock is not None and "stock" in old_values and new_stock != old_values["stock"]:
        delta = new_stock - old_values["stock"]
        movement = StockMovement(
            product_id=product.id,
            type="IN" if delta > 0 else "OUT",
            quantity=abs(delta),
            reason=f"Ajuste manual de stock ({old_values['stock']} → {new_stock})",
            user_id=current_user.id,
            reference_type="product_update",
            reference_id=product.id
        )
        db.add(movement)

    # Historial de Auditoría
    AuditService.log_action(
        db=db,
        entity="producto",
        entity_id=product.id,
        action="actualizar",
        user_id=current_user.id,
        changes={
            "nombre_actual": product.name,
            **{field: {"old": old_values[field], "new": value} for field, value in update_data.items() if field in old_values}
        }
    )
    
    db.commit()
    db.refresh(product)
    return product

# Este endpoint elimina un producto permanentemente (falla si el producto tiene historial)
@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Eliminar producto (RF05)
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    try:
        # Guardar ID provisionalmente antes de la eliminación para poder mapearlo en el log de auditoría
        p_id = product.id
        p_name = product.name
        
        db.delete(product)
        
        # Historial de Auditoría
        AuditService.log_action(
            db=db,
            entity="producto",
            entity_id=p_id,
            action="eliminar",
            user_id=current_user.id,
            changes={"nombre": p_name}
        )
        
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400, 
            detail="No se puede eliminar el producto porque tiene historial (ventas o movimientos). Te recomendamos archivarlo en su lugar."
        )
    return None

# Este endpoint archiva o desarchiva un producto (borrado lógico) sin afectar el historial
@router.patch("/{product_id}/archive", response_model=ProductSchema)
def archive_product(
    product_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Archivar/Desarchivar un producto lógicamente (RF06)
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.archived = not product.archived
    
    # Historial de Auditoría
    AuditService.log_action(
        db=db,
        entity="producto",
        entity_id=product.id,
        action="archivar" if product.archived else "desarchivar",
        user_id=current_user.id
    )
    
    db.commit()
    db.refresh(product)
    return product

# Este endpoint devuelve todos los productos cuyo stock actual sea menor o igual a su stock mínimo
@router.get("/alerts/low-stock", response_model=List[dict])
def get_low_stock_alerts(db: Session = Depends(get_db)):
    """
    Consultar alertas de productos con bajo stock (RF17)
    """
    return AlertService.get_low_stock_alerts(db)

# Este endpoint devuelve los productos que están próximos a caducar según el límite de días brindado
@router.get("/alerts/expiring", response_model=List[dict])
def get_expiring_products(days: int = 30, db: Session = Depends(get_db)):
    """
    Consultar productos próximos a expirar (RF24)
    """
    return AlertService.get_expiring_products(db, days)
