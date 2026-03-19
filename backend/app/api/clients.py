from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.client import Client as ClientModel
from ..schemas.client import Client, ClientCreate, ClientUpdate
from .deps import get_current_active_user
from ..models.user import User
from ..services.audit_service import AuditService

router = APIRouter()

# Este endpoint registra un nuevo cliente en el sistema, validando que no haya duplicados de identificación
@router.post("/", response_model=Client)
def create_client(
    *,
    db: Session = Depends(get_db),
    client_in: ClientCreate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Create a new client.
    """
    # Check if identification already exists if provided
    if client_in.identification:
        existing = db.query(ClientModel).filter(ClientModel.identification == client_in.identification).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Ya existe un cliente con esta identificación."
            )

    db_obj = ClientModel(**client_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    # Log action
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        entity="cliente",
        entity_id=db_obj.id,
        action="crear",
        changes={"name": db_obj.name, "identification": db_obj.identification}
    )

    return db_obj

# Este endpoint obtiene la lista paginada de todos los clientes registrados
@router.get("/", response_model=List[Client])
def read_clients(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Retrieve clients.
    """
    clients = db.query(ClientModel).offset(skip).limit(limit).all()
    return clients

# Este endpoint obtiene los detalles de un cliente específico según su ID
@router.get("/{id}", response_model=Client)
def read_client(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get client by ID.
    """
    client = db.query(ClientModel).filter(ClientModel.id == id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client

# Este endpoint actualiza la información de un cliente existente y guarda el registro del cambio
@router.put("/{id}", response_model=Client)
def update_client(
    *,
    db: Session = Depends(get_db),
    id: int,
    client_in: ClientUpdate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Update a client.
    """
    client = db.query(ClientModel).filter(ClientModel.id == id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Capture old values for audit
    update_data = client_in.model_dump(exclude_unset=True)
    old_values = {field: getattr(client, field) for field in update_data.keys()}

    for field, value in update_data.items():
        setattr(client, field, value)

    db.add(client)
    db.commit()
    db.refresh(client)

    # Log action
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        entity="cliente",
        entity_id=client.id,
        action="actualizar",
        changes={
            "nombre_actual": client.name,
            **{field: {"old": old_values[field], "new": value} for field, value in update_data.items()}
        }
    )

    return client

# Este endpoint elimina permanentemente a un cliente del registro
@router.delete("/{id}")
def delete_client(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Delete a client.
    """
    client = db.query(ClientModel).filter(ClientModel.id == id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Check for relations (sales) before deleting if necessary
    # For now, simple delete
    
    db.delete(client)
    db.commit()

    # Log action
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        entity="cliente",
        entity_id=id,
        action="eliminar",
        changes={"name": client.name}
    )

    return {"message": "Cliente eliminado con éxito"}
