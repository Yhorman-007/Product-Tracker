from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.models.user import User
from typing import Any, Dict, Optional

class AuditService:
    # Función encargada de registrar cualquier cambio crítico (creación, edición, eliminación) en el historial de eventos del sistema
    @staticmethod
    def log_action(
        db: Session,
        entity: str,
        entity_id: int,
        action: str,
        user_id: Optional[int] = None,
        changes: Optional[Dict[str, Any]] = None
    ):
        """
        Record an action in the audit log
        """
        db_log = AuditLog(
            user_id=user_id,
            entity=entity,
            entity_id=entity_id,
            action=action,
            changes=changes
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        return db_log

    # Función que permite filtrar y obtener la lista histórica de modificaciones según entidad y paginación
    @staticmethod
    def get_logs(
        db: Session,
        entity: Optional[str] = None,
        entity_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ):
        query = db.query(
            AuditLog.id,
            AuditLog.user_id,
            AuditLog.entity,
            AuditLog.entity_id,
            AuditLog.action,
            AuditLog.changes,
            AuditLog.created_at,
            User.username.label("user_name")
        ).outerjoin(User, AuditLog.user_id == User.id)
        
        if entity:
            query = query.filter(AuditLog.entity == entity)
        if entity_id:
            query = query.filter(AuditLog.entity_id == entity_id)
        
        return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
