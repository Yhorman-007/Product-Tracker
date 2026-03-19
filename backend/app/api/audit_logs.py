from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.audit_log import AuditLog
from app.services.audit_service import AuditService

router = APIRouter()

# Este endpoint recupera el historial de auditoría del sistema con filtros opcionales
@router.get("/", response_model=List[AuditLog])
def get_audit_logs(
    entity: Optional[str] = None,
    entity_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get audit logs with optional filtering
    """
    return AuditService.get_logs(db, entity, entity_id, skip, limit)
