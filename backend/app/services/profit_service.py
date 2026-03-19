"""
Profit Service - Business logic for profit calculations
RF08: Calculate gross profits
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import Product, Sale, SaleItem

class ProfitService:
    # Esta función calcula detalladamente la ganancia bruta y margen de un solo producto
    @staticmethod
    def calculate_product_profit(db: Session, product_id: int):
        """
        Calculate gross profit for a specific product (RF08)
        """
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        # Obtiene todas las ventas realizadas de este producto para calcular los ingresos
        sales_items = db.query(SaleItem).filter(SaleItem.product_id == product_id).all()
        
        total_revenue = 0
        total_cost = 0
        total_units_sold = 0
        
        for item in sales_items:
            total_revenue += item.subtotal
            total_cost += (product.price_purchase * item.quantity)
            total_units_sold += item.quantity
        
        gross_profit = total_revenue - total_cost
        margin_percentage = (float(gross_profit) / float(total_revenue) * 100) if total_revenue > 0 else 0
        
        return {
            "product_id": product_id,
            "product_name": product.name,
            "units_sold": total_units_sold,
            "total_revenue": round(float(total_revenue), 2),
            "total_cost": round(float(total_cost), 2),
            "gross_profit": round(float(gross_profit), 2),
            "margin_percentage": round(float(margin_percentage), 2)
        }
    
    # Esta función calcula la ganancia global combinando las ganancias de todos los productos vigentes
    @staticmethod
    def calculate_total_profit(db: Session):
        """
        Calculate total gross profit across all products
        """
        products = db.query(Product).filter(Product.archived == False).all()
        
        total_profit = 0
        total_revenue = 0
        products_data = []
        
        for product in products:
            profit_data = ProfitService.calculate_product_profit(db, product.id)
            total_profit += profit_data["gross_profit"]
            total_revenue += profit_data["total_revenue"]
            
            if profit_data["units_sold"] > 0:  # Only include products that have sold
                products_data.append(profit_data)
        
        return {
            "total_gross_profit": round(float(total_profit), 2),
            "total_revenue": round(float(total_revenue), 2),
            "overall_margin": round((float(total_profit) / float(total_revenue) * 100) if total_revenue > 0 else 0, 2),
            "products": products_data
        }
