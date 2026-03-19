from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Product, Sale, SaleItem
from ..services import AlertService
from datetime import date

router = APIRouter()

# Este endpoint genera un reporte completo sobre la valoración actual de todo el inventario
@router.get("/valuation")
def get_stock_valuation(db: Session = Depends(get_db)):
    """
    Get stock valuation report
    """
    products = db.query(Product).filter(Product.archived == False).all()
    
    valuation_data = []
    total_cost_value = 0
    total_sale_value = 0
    
    for product in products:
        cost_value = product.stock * product.price_purchase
        sale_value = product.stock * product.price_sale
        potential_profit = sale_value - cost_value
        
        total_cost_value += cost_value
        total_sale_value += sale_value
        
        valuation_data.append({
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "category": product.category,
            "stock": product.stock,
            "unit_cost": product.price_purchase,
            "unit_price": product.price_sale,
            "total_cost": round(cost_value, 2),
            "total_sale": round(sale_value, 2),
            "potential_profit": round(potential_profit, 2)
        })
    
    return {
        "products": valuation_data,
        "total_cost_value": round(total_cost_value, 2),
        "total_sale_value": round(total_sale_value, 2),
        "total_potential_profit": round(total_sale_value - total_cost_value, 2),
        "total_products": len(valuation_data)
    }

from sqlalchemy.orm import joinedload

# Este endpoint devuelve un resumen gerencial de las ventas (ingresos, costos y ganancias netas)
@router.get("/sales-summary")
def get_sales_summary(db: Session = Depends(get_db)):
    """
    Get sales analysis summary.
    total_units_sold = SUM(quantity) de sale_items (unidades vendidas, no registros).
    """
    # Optimize with joinedload to avoid N+1 query problem during cost calculation
    sales = db.query(Sale).options(
        joinedload(Sale.items).joinedload(SaleItem.product)
    ).all()
    
    total_sales = len(sales)
    total_revenue = sum(sale.total for sale in sales)
    total_discount = sum(sale.discount for sale in sales)
    
    # Calculate real cost of goods sold (COGS) to find net profit
    total_cost_of_sales = 0
    for sale in sales:
        for item in sale.items:
            # We use the product's CURRENT purchase price as a proxy if it wasn't captured at sale time
            # Ideally, sale_items should have the purchase_price at that moment.
            total_cost_of_sales += (item.quantity * (item.product.price_purchase if item.product else 0))

    net_profit = total_revenue - total_cost_of_sales
    
    # SUM(quantity) de sale_items - unidades totales vendidas
    total_units_result = db.query(func.coalesce(func.sum(SaleItem.quantity), 0)).scalar()
    total_units_sold = int(total_units_result) if total_units_result else 0

    # Daily sales
    today = date.today()
    daily_sales = db.query(Sale).filter(func.date(Sale.created_at) == today).all()
    daily_revenue = sum(sale.total for sale in daily_sales)
    
    payment_methods = {}
    for sale in sales:
        method = sale.payment_method
        payment_methods[method] = payment_methods.get(method, 0) + 1
    
    return {
        "total_sales": total_sales,
        "total_revenue": round(total_revenue, 2),
        "total_cost_of_sales": round(total_cost_of_sales, 2),
        "net_profit": round(net_profit, 2),
        "daily_revenue": round(daily_revenue, 2),
        "total_discount": round(total_discount, 2),
        "total_units_sold": total_units_sold,
        "payment_methods": payment_methods,
        "average_sale": round(total_revenue / total_sales, 2) if total_sales > 0 else 0
    }

# Este endpoint elabora el reporte de corte de caja de las ventas realizadas en el día actual
@router.get("/daily-closure")
def get_daily_closure(db: Session = Depends(get_db)):
    """
    Daily closure report (RF10/Cierre de Caja)
    """
    today = date.today()
    sales = db.query(Sale).filter(func.date(Sale.created_at) == today).all()
    
    total_revenue = sum(sale.total for sale in sales)
    total_discount = sum(sale.discount for sale in sales)
    
    methods = {}
    items_count = 0
    
    for sale in sales:
        methods[sale.payment_method] = methods.get(sale.payment_method, 0.0) + sale.total
        items_count += sum(item.quantity for item in sale.items)
        
    return {
        "date": today.isoformat(),
        "total_sales_count": len(sales),
        "total_items_sold": items_count,
        "total_revenue": round(total_revenue, 2),
        "total_discount": round(total_discount, 2),
        "by_payment_method": methods
    }

# Este endpoint identifica los 5 productos más vendidos del sistema (basado en la cantidad total de unidades)
@router.get("/top-products")
def get_top_products(db: Session = Depends(get_db)):
    """
    Get top 5 products by units sold (quantity).
    """
    results = db.query(
        Product.id,
        Product.name,
        Product.stock,
        func.sum(SaleItem.quantity).label("total_sold")
    ).join(SaleItem, Product.id == SaleItem.product_id) \
     .group_by(Product.id) \
     .order_by(func.sum(SaleItem.quantity).desc()) \
     .limit(5) \
     .all()
    
    top_products = []
    for row in results:
        top_products.append({
            "id": row.id,
            "name": row.name,
            "stock": row.stock,
            "total_sold": int(row.total_sold)
        })
        
    return top_products

# Este endpoint consolida y devuelve todas las alertas activas del sistema (stock bajo y fechas de expiración)
@router.get("/alerts")
def get_all_alerts(db: Session = Depends(get_db)):
    """
    Get all inventory alerts (low stock + expiring)
    """
    return AlertService.get_all_alerts(db)
