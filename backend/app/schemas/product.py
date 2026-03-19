from pydantic import BaseModel, Field, computed_field
from typing import Optional, List
from datetime import date, datetime
from app.schemas.product_supplier import ProductSupplier

# Base schemas
class ProductBase(BaseModel):
    name: str
    sku: str
    category: str
    price_purchase: float = Field(gt=0)
    price_sale: float = Field(gt=0)
    unit: str
    stock: int = Field(ge=0)
    min_stock: int = Field(ge=0)
    location: Optional[str] = None
    expiration_date: Optional[date] = None

class ProductCreate(ProductBase):
    supplier_id: Optional[int] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    price_purchase: Optional[float] = Field(None, gt=0)
    price_sale: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = None
    min_stock: Optional[int] = Field(None, ge=0)
    location: Optional[str] = None
    expiration_date: Optional[date] = None
    supplier_id: Optional[int] = None

# Respuesta de Producto (salida)
class Product(ProductBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    supplier_associations: List[ProductSupplier] = []

    @computed_field
    @property
    def gross_profit(self) -> float:
        """Calcula la ganancia bruta (RF08)"""
        return self.price_sale - self.price_purchase

    class Config:
        from_attributes = True

# Force Pydantic v2 to resolve all forward references
Product.model_rebuild()
