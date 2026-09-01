import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

load_dotenv()

from app.config import settings
from app.database import engine, Base
from app.api.auth import limiter

if os.getenv("AUTO_CREATE_TABLES", "false").lower() == "true":
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Product Tracker API",
    description="API SaaS para gestión de inventario, ventas y proveedores",
    version="2.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "message": "Product Tracker API",
        "version": "2.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


from app.api import (
    auth,
    users,
    products,
    sales,
    suppliers,
    purchase_orders,
    reports,
    stock_movements,
    audit_logs,
    clients,
    returns,
    organizations,
    invitations,
    billing,
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(organizations.router, prefix="/api/organizations", tags=["organizations"])
app.include_router(invitations.router, prefix="/api/invitations", tags=["invitations"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(stock_movements.router, prefix="/api/stock-movements", tags=["stock-movements"])
app.include_router(sales.router, prefix="/api/sales", tags=["sales"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["suppliers"])
app.include_router(purchase_orders.router, prefix="/api/purchase-orders", tags=["purchase-orders"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(audit_logs.router, prefix="/api/audit-logs", tags=["audit-logs"])
app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(returns.router, prefix="/api/returns", tags=["returns"])
