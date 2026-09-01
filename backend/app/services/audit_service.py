from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.models.user import User
from typing import Any, Dict, Optional


class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        entity: str,
        entity_id: int,
        action: str,
        organization_id: int,
        user_id: Optional[int] = None,
        changes: Optional[Dict[str, Any]] = None,
    ):
        db_log = AuditLog(
            organization_id=organization_id,
            user_id=user_id,
            entity=entity,
            entity_id=entity_id,
            action=action,
            changes=changes,
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        return db_log

    @staticmethod
    def get_logs(
        db: Session,
        organization_id: int,
        entity: Optional[str] = None,
        entity_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ):
        query = (
            db.query(
                AuditLog.id,
                AuditLog.user_id,
                AuditLog.entity,
                AuditLog.entity_id,
                AuditLog.action,
                AuditLog.changes,
                AuditLog.created_at,
                User.username.label("user_name"),
            )
            .outerjoin(User, AuditLog.user_id == User.id)
            .filter(AuditLog.organization_id == organization_id)
        )

        if entity:
            query = query.filter(AuditLog.entity == entity)
        if entity_id:
            query = query.filter(AuditLog.entity_id == entity_id)

        return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
