from sqlalchemy import Column, Integer, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base

# Este modelo define la relación muchos a muchos entre los productos y sus proveedores
class ProductSupplier(Base):
    """
    Many-to-Many association between Products and Suppliers - RF_CATALOG
    Includes specific cost price for each supplier.
    """
    __tablename__ = "product_supplier"
    
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), primary_key=True)
    cost_price_by_supplier = Column(Float, nullable=False, default=0.0)
    
    # Relationships
    product = relationship("Product", back_populates="supplier_associations")
    supplier = relationship("Supplier", back_populates="product_associations")
