from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.product_supplier import ProductSupplier

# Supplier schemas
class SupplierBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    payment_terms: Optional[str] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    payment_terms: Optional[str] = None
    address: Optional[str] = None

class Supplier(SupplierBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    product_associations: List[ProductSupplier] = []

    class Config:
        from_attributes = True

# Force Pydantic v2 to resolve all forward references
Supplier.model_rebuild()
