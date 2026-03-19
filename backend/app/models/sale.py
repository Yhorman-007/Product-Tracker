from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# Este modelo almacena la cabecera del registro histórico de todas las ventas del sistema
class Sale(Base):
    """
    Sale model - RF41 (ventas que restan stock), RF08 (profit calculation)
    """
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    total = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    payment_method = Column(String(50), nullable=False)  # efectivo, tarjeta, transferencia
    tax_rate = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="sales")
    client = relationship("Client")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


# Este modelo registra el detalle exhaustivo de los productos y precios involucrados en cada venta
class SaleItem(Base):
    """
    Items dentro de una venta
    """
    __tablename__ = "sale_items"
    
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)  # Precio al momento de la venta
    subtotal = Column(Float, nullable=False)     # quantity * unit_price
    
    # Relationships
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")
