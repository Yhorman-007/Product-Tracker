from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from ..database import Base

# Este modelo representa a los clientes registrados en el sistema, incluyendo datos de contacto e identificación
class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    identification = Column(String, unique=True, index=True, nullable=True) # Cedula o NIT
    email = Column(String, index=True, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
