from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# Este modelo registra cada movimiento de inventario (entradas, salidas, ajustes) de un producto
class StockMovement(Base):
    """
    Stock movement tracking - all inventory changes
    """
    __tablename__ = "stock_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    type = Column(String(50), nullable=False)  # entry, exit, transfer
    quantity = Column(Integer, nullable=False)
    reason = Column(String(500))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reference_type = Column(String(50))  # sale, purchase_order, adjustment
    reference_id = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="stock_movements")
    user = relationship("User", back_populates="stock_movements")
