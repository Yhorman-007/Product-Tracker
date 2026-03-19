from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Cargar variables de entorno explicitamente al inicio
load_dotenv()

from app.config import settings
from app.database import engine, Base
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.supplier import Supplier
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.models.audit_log import AuditLog

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="Product Tracker API",
    description="API para gestion de inventario, ventas y proveedores",
    version="1.0.0"
)

# Configuración de CORS - Aplicada inmediatamente después de crear la app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "message": "Product Tracker API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Import and include routers
from app.api import auth, users, products, sales, suppliers, purchase_orders, reports, stock_movements, audit_logs, clients, returns

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(stock_movements.router, prefix="/api/stock-movements", tags=["stock-movements"])
app.include_router(sales.router, prefix="/api/sales", tags=["sales"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["suppliers"])
app.include_router(purchase_orders.router, prefix="/api/purchase-orders", tags=["purchase-orders"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(audit_logs.router, prefix="/api/audit-logs", tags=["audit-logs"])
app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(returns.router, prefix="/api/returns", tags=["returns"])

