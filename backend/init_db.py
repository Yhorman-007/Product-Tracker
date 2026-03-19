import sys
import os

# Add the current directory to sys.path to allow imports from 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models import (
    User, Product, Sale, SaleItem, Supplier, 
    PurchaseOrder, PurchaseOrderItem, StockMovement, AuditLog
)
from app.core.security import get_password_hash
from sqlalchemy import text

def init_db():
    print("--- Iniciando inicialización de la base de datos ---")
    
    # 1. Limpiar tablas existentes (Drop all)
    print("Borrando tablas existentes...")
    Base.metadata.drop_all(bind=engine)
    
    # 2. Crear todas las tablas según los modelos
    print("Creando nuevas tablas...")
    Base.metadata.create_all(bind=engine)
    
    # 3. Crear usuarios estandarizados
    db = SessionLocal()
    try:
        print("Creando usuario ADMIN: Yhorman_Gar23...")
        
        # Admin Maestro
        hashed_password = get_password_hash("123456789Ae.")
        admin_user = User(
            username="Yhorman_Gar23",
            email="yhormangarcesballestas@gmail.com",
            hashed_password=hashed_password,
            full_name="Yhorman Garcia (Admin)",
            role="ADMIN",
            is_active=True
        )
        db.add(admin_user)
        
        print("Creando usuario CAJERO: Logan2525...")
        
        # Cajero de Prueba
        cashier_password = get_password_hash("123456789Ae.")
        cashier_user = User(
            username="Logan2525",
            email="logan@producttracker.com",
            hashed_password=cashier_password,
            full_name="Logan (Cajero)",
            role="CAJERO",
            is_active=True
        )
        db.add(cashier_user)
        
        db.commit()
        print("--- Usuarios creados exitosamente ---")
            
        print("--- Inicialización completada con éxito ---")
        
    except Exception as e:
        print(f"ERROR durante la inicialización: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
