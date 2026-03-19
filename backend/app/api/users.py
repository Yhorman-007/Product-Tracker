from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User as UserModel
from ..schemas.user import User, UserCreate
from ..core.security import get_password_hash
from .deps import get_current_active_admin, get_current_active_user

router = APIRouter()

# Este endpoint permite a un administrador dar de alta manualmente a un nuevo operario o supervisor
@router.post("/", response_model=User)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    current_user: UserModel = Depends(get_current_active_admin)
) -> Any:
    """
    Create new user (Only for Admins)
    """
    user = db.query(UserModel).filter(UserModel.username == user_in.username).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = db.query(UserModel).filter(UserModel.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
        
    db_obj = UserModel(
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

# Este endpoint devuelve en todo momento los datos del usuario que actualmente está interactuando
@router.get("/me", response_model=User)
def read_user_me(
    current_user: UserModel = Depends(get_current_active_user),
) -> Any:
    """
    Get current user (any authenticated active user)
    """
    return current_user
