from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Purchase Order Item schemas
class PurchaseOrderItemBase(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_cost: float = Field(gt=0)

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItem(PurchaseOrderItemBase):
    id: int
    purchase_order_id: int
    received_quantity: int = 0
    
    class Config:
        from_attributes = True

# Schemas for receiving PO (RF36)
class PurchaseOrderItemReceive(BaseModel):
    item_id: int
    received_quantity: int = Field(gt=0)

class PurchaseOrderReceive(BaseModel):
    items: List[PurchaseOrderItemReceive]

# Purchase Order schemas
class PurchaseOrderBase(BaseModel):
    supplier_id: int
    notes: Optional[str] = None
    payment_method: Optional[str] = "contado"
    due_date: Optional[datetime] = None
    is_paid: Optional[bool] = False

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate]

class PurchaseOrder(PurchaseOrderBase):
    id: int
    status: str
    total: float
    created_at: datetime
    received_at: Optional[datetime] = None
    items: List[PurchaseOrderItem] = []
    
    class Config:
        from_attributes = True
