"""
Profit Service - Business logic for profit calculations
"""
from sqlalchemy.orm import Session
from ..models import Product, SaleItem


class ProfitService:
    @staticmethod
    def calculate_product_profit(db: Session, product_id: int, organization_id: int):
        product = (
            db.query(Product)
            .filter(Product.id == product_id, Product.organization_id == organization_id)
            .first()
        )
        if not product:
            raise ValueError(f"Product {product_id} not found")

        sales_items = (
            db.query(SaleItem)
            .join(Product, SaleItem.product_id == Product.id)
            .filter(SaleItem.product_id == product_id, Product.organization_id == organization_id)
            .all()
        )

        total_revenue = total_cost = total_units_sold = 0
        for item in sales_items:
            total_revenue += item.subtotal
            total_cost += product.price_purchase * item.quantity
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
            "margin_percentage": round(float(margin_percentage), 2),
        }

    @staticmethod
    def calculate_total_profit(db: Session, organization_id: int):
        products = (
            db.query(Product)
            .filter(Product.organization_id == organization_id, Product.archived == False)
            .all()
        )
        total_profit = total_revenue = 0
        products_data = []
        for product in products:
            profit_data = ProfitService.calculate_product_profit(db, product.id, organization_id)
            total_profit += profit_data["gross_profit"]
            total_revenue += profit_data["total_revenue"]
            if profit_data["units_sold"] > 0:
                products_data.append(profit_data)
        return {
            "total_gross_profit": round(float(total_profit), 2),
            "total_revenue": round(float(total_revenue), 2),
            "overall_margin": round((float(total_profit) / float(total_revenue) * 100) if total_revenue > 0 else 0, 2),
            "products": products_data,
        }
