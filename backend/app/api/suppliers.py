from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas import Supplier as SupplierSchema, SupplierCreate, SupplierUpdate, ProductSupplier as ProductSupplierSchema, ProductSupplierCreate
from ..models import Supplier, ProductSupplier, Product, User
from ..services import AuditService
from .deps import get_current_active_user

router = APIRouter()

# Este endpoint recupera la lista paginada de los proveedores registrados en el sistema
@router.get("/", response_model=List[SupplierSchema])
def get_suppliers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all suppliers"""
    suppliers = db.query(Supplier).offset(skip).limit(limit).all()
    return suppliers

# Este endpoint recupera los detalles completos de un proveedor buscando por su ID
@router.get("/{supplier_id}", response_model=SupplierSchema)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    """Get supplier by ID"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

# Este endpoint crea un nuevo proveedor en la base de datos y manda el registro al log de auditoría
@router.post("/", response_model=SupplierSchema, status_code=status.HTTP_201_CREATED)
def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db)):
    """Create new supplier"""
    db_supplier = Supplier(**supplier.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    
    # Audit Log
    AuditService.log_action(
        db=db,
        entity="proveedor",
        entity_id=db_supplier.id,
        action="crear",
        user_id=None, # Update with deps if needed, but for now let's use the current user if available
        changes={"name": db_supplier.name}
    )
    
    return db_supplier

# Este endpoint actualiza los datos de un proveedor existente
@router.put("/{supplier_id}", response_model=SupplierSchema)
def update_supplier(
    supplier_id: int,
    supplier_update: SupplierUpdate,
    db: Session = Depends(get_db)
):
    """Update supplier"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    update_data = supplier_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)
    
    db.commit()
    db.refresh(supplier)
    
    # Audit Log
    AuditService.log_action(
        db=db,
        entity="proveedor",
        entity_id=supplier.id,
        action="actualizar",
        changes={k: {"old": getattr(supplier, k), "new": v} for k, v in update_data.items()}
    )
    
    return supplier

# Este endpoint elimina a un proveedor de la base de datos permanentemente
@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    """Delete supplier"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Audit Log
    AuditService.log_action(
        db=db,
        entity="proveedor",
        entity_id=supplier.id,
        action="eliminar",
        changes={"name": supplier.name}
    )
    
    db.delete(supplier)
    db.commit()
    return None

# Este endpoint consigue la lista de todos los productos que vende este proveedor
@router.get("/{supplier_id}/catalogue", response_model=List[ProductSupplierSchema])
def get_supplier_catalogue(supplier_id: int, db: Session = Depends(get_db)):
    """Get all products in the supplier's catalogue"""
    catalogue = db.query(ProductSupplier).filter(ProductSupplier.supplier_id == supplier_id).all()
    return catalogue

# Este endpoint asocia un producto ya existente al catálogo del proveedor para registrar su costo de compra
@router.post("/{supplier_id}/catalogue", response_model=ProductSupplierSchema)
def add_to_catalogue(
    supplier_id: int,
    item: ProductSupplierCreate,
    db: Session = Depends(get_db)
):
    """Add a product to the supplier's catalogue"""
    # Verify supplier and product exist
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    product = db.query(Product).filter(Product.id == item.product_id).first()
    if not supplier or not product:
        raise HTTPException(status_code=404, detail="Supplier or Product not found")
    
    # Check if already in catalogue
    existing = db.query(ProductSupplier).filter(
        ProductSupplier.supplier_id == supplier_id,
        ProductSupplier.product_id == item.product_id
    ).first()
    
    if existing:
        existing.cost_price_by_supplier = item.cost_price_by_supplier
        db.commit()
        db.refresh(existing)
        return existing
    
    db_item = ProductSupplier(
        supplier_id=supplier_id,
        product_id=item.product_id,
        cost_price_by_supplier=item.cost_price_by_supplier
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

# Este endpoint remueve un producto del catálogo de opciones del proveedor
@router.delete("/{supplier_id}/catalogue/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_catalogue(supplier_id: int, product_id: int, db: Session = Depends(get_db)):
    """Remove a product from the supplier's catalogue"""
    db_item = db.query(ProductSupplier).filter(
        ProductSupplier.supplier_id == supplier_id,
        ProductSupplier.product_id == product_id
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found in catalogue")
    
    db.delete(db_item)
    db.commit()
    return None
