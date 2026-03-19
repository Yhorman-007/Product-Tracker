from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ReturnItemBase(BaseModel):
    product_id: int
    quantity: int

class ReturnItemCreate(ReturnItemBase):
    pass

class ReturnItem(ReturnItemBase):
    id: int
    return_id: int

    class Config:
        from_attributes = True

class ReturnSaleBase(BaseModel):
    sale_id: int
    reason: str

class ReturnSaleCreate(ReturnSaleBase):
    items: List[ReturnItemCreate]

class ReturnSale(ReturnSaleBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime
    items: List[ReturnItem]

    class Config:
        from_attributes = True
