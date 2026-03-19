from pydantic import BaseModel, Field
from typing import Optional

class ProductSupplierBase(BaseModel):
    product_id: int
    supplier_id: int
    cost_price_by_supplier: float = Field(ge=0)

class ProductSupplierCreate(ProductSupplierBase):
    pass

class ProductSupplierUpdate(BaseModel):
    cost_price_by_supplier: Optional[float] = Field(None, ge=0)

class ProductSupplier(ProductSupplierBase):
    class Config:
        from_attributes = True

class ProductSupplierDetail(ProductSupplier):
    product_name: str
    supplier_name: str
    sku: str
