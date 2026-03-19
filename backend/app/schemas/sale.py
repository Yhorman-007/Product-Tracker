from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Sale Item schemas
class SaleItemBase(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0)

class SaleItemCreate(SaleItemBase):
    pass

class SaleItem(SaleItemBase):
    id: int
    sale_id: int
    subtotal: float
    
    class Config:
        from_attributes = True

# Sale schemas
class SaleBase(BaseModel):
    payment_method: str
    discount: float = Field(default=0.0, ge=0)
    tax_rate: float = Field(default=0.0, ge=0)
    tax_amount: float = Field(default=0.0, ge=0)
    client_id: Optional[int] = None

class SaleCreate(SaleBase):
    items: List[SaleItemCreate]

class Sale(SaleBase):
    id: int
    total: float
    user_id: Optional[int] = None
    client_id: Optional[int] = None
    created_at: datetime
    items: List[SaleItem] = []
    
    class Config:
        from_attributes = True
