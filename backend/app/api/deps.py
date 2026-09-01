from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

from ..core import security
from ..config import settings
from ..database import get_db
from ..models import User, Organization
from ..schemas.token import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login/access-token")


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[security.ALGORITHM])
        token_data = TokenPayload(**payload)
        if token_data.type and token_data.type != "access":
            raise HTTPException(status_code=403, detail="Invalid token type")
    except (jwt.JWTError, ValidationError):
        raise HTTPException(status_code=403, detail="Could not validate credentials")

    user = db.query(User).filter(User.id == int(token_data.sub)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_organization(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Organization:
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


def get_current_active_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")
    return current_user


def require_write_access(org: Organization = Depends(get_current_organization)) -> Organization:
    if org.status in ("canceled", "read_only"):
        raise HTTPException(
            status_code=402,
            detail="Subscription inactive. Upgrade or renew your plan to make changes.",
        )
    if org.plan == "trial" and org.trial_ends_at:
        trial_end = org.trial_ends_at
        if trial_end.tzinfo is None:
            trial_end = trial_end.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > trial_end and org.status != "active":
            raise HTTPException(
                status_code=402,
                detail="Trial expired. Please subscribe to continue.",
            )
    return org
