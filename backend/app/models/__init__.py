# Import all models here for Alembic to detect them
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.supplier import Supplier
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.models.product_supplier import ProductSupplier
from app.models.audit_log import AuditLog
from app.models.client import Client
from app.models.return_sale import ReturnSale, ReturnItem

__all__ = [
    "Product",
    "Sale",
    "SaleItem",
    "Supplier",
    "PurchaseOrder",
    "PurchaseOrderItem",
    "StockMovement",
    "User",
    "AuditLog",
    "ProductSupplier",
    "Client",
    "ReturnSale",
    "ReturnItem",
]
