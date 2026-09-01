from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import date

from ..database import get_db
from ..models import Product, Sale, SaleItem, User
from ..services import AlertService
from .deps import get_current_active_user

router = APIRouter()


@router.get("/valuation")
def get_stock_valuation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    products = (
        db.query(Product)
        .filter(Product.organization_id == current_user.organization_id, Product.archived == False)
        .all()
    )
    valuation_data = []
    total_cost_value = total_sale_value = 0
    for product in products:
        cost_value = product.stock * product.price_purchase
        sale_value = product.stock * product.price_sale
        total_cost_value += cost_value
        total_sale_value += sale_value
        valuation_data.append(
            {
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "category": product.category,
                "stock": product.stock,
                "unit_cost": product.price_purchase,
                "unit_price": product.price_sale,
                "total_cost": round(cost_value, 2),
                "total_sale": round(sale_value, 2),
                "potential_profit": round(sale_value - cost_value, 2),
            }
        )
    return {
        "products": valuation_data,
        "total_cost_value": round(total_cost_value, 2),
        "total_sale_value": round(total_sale_value, 2),
        "total_potential_profit": round(total_sale_value - total_cost_value, 2),
        "total_products": len(valuation_data),
    }


@router.get("/sales-summary")
def get_sales_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    org_id = current_user.organization_id
    sales = (
        db.query(Sale)
        .filter(Sale.organization_id == org_id)
        .options(joinedload(Sale.items).joinedload(SaleItem.product))
        .all()
    )
    total_sales = len(sales)
    total_revenue = sum(sale.total for sale in sales)
    total_discount = sum(sale.discount for sale in sales)
    total_cost_of_sales = 0
    for sale in sales:
        for item in sale.items:
            total_cost_of_sales += item.quantity * (item.product.price_purchase if item.product else 0)
    net_profit = total_revenue - total_cost_of_sales
    total_units_result = (
        db.query(func.coalesce(func.sum(SaleItem.quantity), 0))
        .join(Sale, SaleItem.sale_id == Sale.id)
        .filter(Sale.organization_id == org_id)
        .scalar()
    )
    total_units_sold = int(total_units_result) if total_units_result else 0
    today = date.today()
    daily_sales = (
        db.query(Sale)
        .filter(Sale.organization_id == org_id, func.date(Sale.created_at) == today)
        .all()
    )
    daily_revenue = sum(sale.total for sale in daily_sales)
    payment_methods = {}
    for sale in sales:
        payment_methods[sale.payment_method] = payment_methods.get(sale.payment_method, 0) + 1
    return {
        "total_sales": total_sales,
        "total_revenue": round(total_revenue, 2),
        "total_cost_of_sales": round(total_cost_of_sales, 2),
        "net_profit": round(net_profit, 2),
        "daily_revenue": round(daily_revenue, 2),
        "total_discount": round(total_discount, 2),
        "total_units_sold": total_units_sold,
        "payment_methods": payment_methods,
        "average_sale": round(total_revenue / total_sales, 2) if total_sales > 0 else 0,
    }


@router.get("/daily-closure")
def get_daily_closure(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    today = date.today()
    sales = (
        db.query(Sale)
        .filter(Sale.organization_id == current_user.organization_id, func.date(Sale.created_at) == today)
        .all()
    )
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
        "by_payment_method": methods,
    }


@router.get("/top-products")
def get_top_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    results = (
        db.query(
            Product.id,
            Product.name,
            Product.stock,
            func.sum(SaleItem.quantity).label("total_sold"),
        )
        .join(SaleItem, Product.id == SaleItem.product_id)
        .join(Sale, SaleItem.sale_id == Sale.id)
        .filter(Product.organization_id == current_user.organization_id, Sale.organization_id == current_user.organization_id)
        .group_by(Product.id)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
        .all()
    )
    return [{"id": r.id, "name": r.name, "stock": r.stock, "total_sold": int(r.total_sold)} for r in results]


@router.get("/alerts")
def get_all_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return AlertService.get_all_alerts(db, current_user.organization_id)
