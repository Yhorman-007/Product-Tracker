from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# Este modelo almacena la cabecera de las órdenes de compra realizadas a los proveedores
class PurchaseOrder(Base):
    """
    Purchase Order model - Orders to suppliers
    """
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    status = Column(String(50), default="pending")  # pending, parcial, completado
    total = Column(Float, nullable=False)
    payment_method = Column(String(50), default="contado")  # contado, credito
    due_date = Column(DateTime(timezone=True), nullable=True)
    is_paid = Column(Boolean, default=False)
    notes = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    received_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")


# Este modelo representa el detalle de cada producto y cantidad solicitada dentro de una orden de compra
class PurchaseOrderItem(Base):
    """
    Items in a purchase order
    """
    __tablename__ = "purchase_order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    received_quantity = Column(Integer, default=0, nullable=False)
    unit_cost = Column(Float, nullable=False)
    
    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product", back_populates="purchase_order_items")
