"""
Stock Service - Business logic for stock management
RF41: Automatic stock reduction on sales
"""
from sqlalchemy.orm import Session
from ..models import Product, StockMovement
from datetime import datetime

class StockService:
    # Esta función se encarga de reducir la cantidad de stock de un producto tras una venta o salida
    @staticmethod
    def reduce_stock(db: Session, product_id: int, quantity: int, reason: str, 
                     reference_type: str = "sale", reference_id: int = None, user_id: int = None):
        """
        Reduce stock for a product (RF41)
        """
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        if product.stock < quantity:
            raise ValueError(f"Insufficient stock for {product.name}. Available: {product.stock}, Requested: {quantity}")
        
        # Update stock
        product.stock -= quantity
        
        # Create stock movement record
        movement = StockMovement(
            product_id=product_id,
            type="SALE" if reference_type == "sale" else "OUT",
            quantity=quantity,
            reason=reason,
            reference_type=reference_type,
            reference_id=reference_id,
            user_id=user_id
        )
        db.add(movement)
        
        return product
    
    # Esta función incrementa el stock de un producto cuando se recibe mercadería o una devolución
    @staticmethod
    def increase_stock(db: Session, product_id: int, quantity: int, reason: str,
                      reference_type: str = "purchase_order", reference_id: int = None, user_id: int = None):
        """
        Increase stock for a product (when receiving purchase orders)
        """
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        # Update stock
        product.stock += quantity
        
        # Create stock movement record
        movement = StockMovement(
            product_id=product_id,
            type="IN",
            quantity=quantity,
            reason=reason,
            reference_type=reference_type,
            reference_id=reference_id,
            user_id=user_id
        )
        db.add(movement)
