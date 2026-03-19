from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime

class AuditLogBase(BaseModel):
    user_id: Optional[int] = None
    entity: str
    entity_id: int
    action: str
    changes: Optional[Dict[str, Any]] = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLog(AuditLogBase):
    id: int
    created_at: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True
