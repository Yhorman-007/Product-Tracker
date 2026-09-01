from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.plans import get_plan_limits
from ..database import get_db
from ..models import User as UserModel
from ..schemas.user import User, UserCreate
from ..core.security import get_password_hash
from .deps import get_current_active_admin, get_current_active_user, get_current_organization, require_write_access

router = APIRouter()


@router.post("/", response_model=User)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    current_user: UserModel = Depends(get_current_active_admin),
    org=Depends(require_write_access),
) -> Any:
    limits = get_plan_limits(org.plan)
    count = db.query(UserModel).filter(UserModel.organization_id == org.id).count()
    if count >= limits.max_users:
        raise HTTPException(status_code=402, detail="User limit reached for your plan")

    if db.query(UserModel).filter(UserModel.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="The user with this username already exists.")
    if db.query(UserModel).filter(UserModel.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="The user with this email already exists.")

    db_obj = UserModel(
        organization_id=org.id,
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        is_active=user_in.is_active,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.get("/me", response_model=User)
def read_user_me(current_user: UserModel = Depends(get_current_active_user)) -> Any:
    return current_user


@router.get("/", response_model=List[User])
def list_users(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_admin),
) -> Any:
    return db.query(UserModel).filter(UserModel.organization_id == current_user.organization_id).all()
