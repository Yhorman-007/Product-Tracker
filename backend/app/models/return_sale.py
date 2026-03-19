from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

# Este modelo representa la cabecera de una devolución de venta
class ReturnSale(Base):
    __tablename__ = "returns"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    reason = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sale = relationship("Sale")
    user = relationship("User")
    items = relationship("ReturnItem", back_populates="return_sale", cascade="all, delete-orphan")

# Este modelo representa el detalle de los productos y cantidades por cada devolución
class ReturnItem(Base):
    __tablename__ = "return_items"

    id = Column(Integer, primary_key=True, index=True)
    return_id = Column(Integer, ForeignKey("returns.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)

    # Relationships
    return_sale = relationship("ReturnSale", back_populates="items")
    product = relationship("Product")
