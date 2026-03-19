"""
Alert Service - Business logic for inventory alerts
RF17: Low stock alerts
RF24: Expiration alerts
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_
from ..models import Product
from datetime import datetime, timedelta

class AlertService:
    # Esta función recupera todos los productos cuyo inventario actual está por debajo de su margen seguro mínimo (stock bajo)
    @staticmethod
    def get_low_stock_alerts(db: Session):
        """
        Get products with stock at or below minimum threshold (RF17)
        """
        low_stock_products = db.query(Product).filter(
            and_(
                Product.stock <= Product.min_stock,
                Product.archived == False
            )
        ).all()
        
        alerts = []
        for product in low_stock_products:
            alerts.append({
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "current_stock": product.stock,
                "min_stock": product.min_stock,
                "shortage": product.min_stock - product.stock,
                "severity": "critical" if product.stock == 0 else "warning"
            })
        
        return alerts
    
    # Esta función escanea productos perecederos para encontrar cuáles están a punto de expirar dentro de los próximos 'days_ahead'
    @staticmethod
    def get_expiring_products(db: Session, days_ahead: int = 30):
        """
        Get products expiring within the specified days (RF24)
        """
        today = datetime.now().date()
        cutoff_date = today + timedelta(days=days_ahead)
        
        expiring_products = db.query(Product).filter(
            and_(
                Product.expiration_date.isnot(None),
                Product.expiration_date >= today,
                Product.expiration_date <= cutoff_date,
                Product.archived == False
            )
        ).all()
        
        alerts = []
        for product in expiring_products:
            days_until_expiry = (product.expiration_date - today).days
            
            alerts.append({
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "expiration_date": product.expiration_date.isoformat(),
                "days_until_expiry": days_until_expiry,
                "stock": product.stock,
                "severity": "critical" if days_until_expiry <= 7 else "warning"
            })
        
        return sorted(alerts, key=lambda x: x["days_until_expiry"])
    
    # Esta función consolida todas las alertas (fechas de expiración y stock bajo) en un solo reporte conjunto
    @staticmethod
    def get_all_alerts(db: Session):
        """
        Get all alerts (low stock + expiring)
        """
        return {
            "low_stock": AlertService.get_low_stock_alerts(db),
            "expiring": AlertService.get_expiring_products(db)
        }
