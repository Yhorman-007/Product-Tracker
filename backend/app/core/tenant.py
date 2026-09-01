from fastapi import HTTPException, status
from sqlalchemy.orm import Session


def get_org_resource(db: Session, model, organization_id: int, resource_id: int):
    obj = (
        db.query(model)
        .filter(model.id == resource_id, model.organization_id == organization_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return obj
