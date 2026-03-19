from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# Este modelo almacena el registro de auditoría (historial de acciones y cambios) en el sistema
class AuditLog(Base):
    """
    Audit log for tracking all changes
    """
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    entity = Column(String(100), nullable=False)  # product, sale, supplier, etc.
    entity_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)  # create, update, delete, archive
    changes = Column(JSON)  # JSON con los cambios: {field: {old: value, new: value}}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
