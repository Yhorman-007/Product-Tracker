from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas.audit_log import AuditLog
from app.services.audit_service import AuditService
from app.models.user import User
from .deps import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[AuditLog])
def get_audit_logs(
    entity: Optional[str] = None,
    entity_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return AuditService.get_logs(
        db, current_user.organization_id, entity, entity_id, skip, limit
    )
