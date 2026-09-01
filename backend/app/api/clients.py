from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.tenant import get_org_resource
from ..database import get_db
from ..models.client import Client as ClientModel
from ..models.user import User
from ..schemas.client import Client, ClientCreate, ClientUpdate
from ..services.audit_service import AuditService
from .deps import get_current_active_user, require_write_access

router = APIRouter()


@router.post("/", response_model=Client)
def create_client(
    *,
    db: Session = Depends(get_db),
    client_in: ClientCreate,
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
) -> Any:
    if client_in.identification:
        existing = (
            db.query(ClientModel)
            .filter(
                ClientModel.organization_id == org.id,
                ClientModel.identification == client_in.identification,
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe un cliente con esta identificación.")

    db_obj = ClientModel(**client_in.model_dump(), organization_id=org.id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        organization_id=org.id,
        entity="cliente",
        entity_id=db_obj.id,
        action="crear",
        changes={"name": db_obj.name, "identification": db_obj.identification},
    )
    return db_obj


@router.get("/", response_model=List[Client])
def read_clients(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return (
        db.query(ClientModel)
        .filter(ClientModel.organization_id == current_user.organization_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{id}", response_model=Client)
def read_client(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return get_org_resource(db, ClientModel, current_user.organization_id, id)


@router.put("/{id}", response_model=Client)
def update_client(
    *,
    db: Session = Depends(get_db),
    id: int,
    client_in: ClientUpdate,
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
) -> Any:
    client = get_org_resource(db, ClientModel, org.id, id)
    update_data = client_in.model_dump(exclude_unset=True)
    old_values = {field: getattr(client, field) for field in update_data.keys()}
    for field, value in update_data.items():
        setattr(client, field, value)
    db.add(client)
    db.commit()
    db.refresh(client)
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        organization_id=org.id,
        entity="cliente",
        entity_id=client.id,
        action="actualizar",
        changes={
            "nombre_actual": client.name,
            **{field: {"old": old_values[field], "new": value} for field, value in update_data.items()},
        },
    )
    return client


@router.delete("/{id}")
def delete_client(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user),
    org=Depends(require_write_access),
) -> Any:
    client = get_org_resource(db, ClientModel, org.id, id)
    db.delete(client)
    db.commit()
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        organization_id=org.id,
        entity="cliente",
        entity_id=id,
        action="eliminar",
        changes={"name": client.name},
    )
    return {"message": "Cliente eliminado con éxito"}
