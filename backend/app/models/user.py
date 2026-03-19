from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# Este modelo almacena a los usuarios registrados en el sistema, credenciales y roles para autenticación
class User(Base):
    """
    User model for authentication
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    role = Column(String(50), default="CAJERO")  # ADMIN, SUPERVISOR, CAJERO
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    sales = relationship("Sale", back_populates="user")
    stock_movements = relationship("StockMovement", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
