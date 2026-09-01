from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from ..config import settings
from ..core import security
from ..core.org_utils import trial_end_date, unique_slug
from ..database import get_db
from ..models import Organization, User
from ..schemas.organization import SignupRequest, SignupResponse
from ..schemas.token import Token
from ..schemas.user import PasswordReset, PasswordResetRequest
from ..services.email_service import send_recovery_email

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login/access-token", response_model=Token)
@limiter.limit(settings.rate_limit_login)
def login_access_token(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    username = form_data.username.strip()
    user = db.query(User).filter(User.username == username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_expires = timedelta(minutes=settings.access_token_expire_minutes)
    refresh_expires = timedelta(minutes=settings.refresh_token_expire_minutes)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_expires, organization_id=user.organization_id
        ),
        "refresh_token": security.create_refresh_token(
            user.id, expires_delta=refresh_expires, organization_id=user.organization_id
        ),
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)) -> Any:
    try:
        payload = jwt.decode(body.refresh_token, settings.secret_key, algorithms=[security.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=403, detail="Invalid token type")
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=403, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=403, detail="User not found or inactive")

    access_expires = timedelta(minutes=settings.access_token_expire_minutes)
    refresh_expires = timedelta(minutes=settings.refresh_token_expire_minutes)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_expires, organization_id=user.organization_id
        ),
        "refresh_token": security.create_refresh_token(
            user.id, expires_delta=refresh_expires, organization_id=user.organization_id
        ),
        "token_type": "bearer",
    }


@router.post("/signup", response_model=SignupResponse)
@limiter.limit(settings.rate_limit_signup)
def signup(request: Request, body: SignupRequest, db: Session = Depends(get_db)) -> Any:
    username = body.username.strip()
    email = body.email.strip().lower()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    org = Organization(
        name=body.organization_name.strip(),
        slug=unique_slug(db, body.organization_name),
        plan="trial",
        status="active",
        trial_ends_at=trial_end_date(14),
    )
    db.add(org)
    db.flush()

    user = User(
        organization_id=org.id,
        username=username,
        email=email,
        hashed_password=security.get_password_hash(body.password),
        full_name=body.full_name,
        role="ADMIN",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(org)

    access_expires = timedelta(minutes=settings.access_token_expire_minutes)
    refresh_expires = timedelta(minutes=settings.refresh_token_expire_minutes)
    return SignupResponse(
        user_id=user.id,
        organization_id=org.id,
        organization_name=org.name,
        access_token=security.create_access_token(
            user.id, expires_delta=access_expires, organization_id=org.id
        ),
        refresh_token=security.create_refresh_token(
            user.id, expires_delta=refresh_expires, organization_id=org.id
        ),
    )


@router.post("/password-recovery")
def recover_password(request: PasswordResetRequest, db: Session = Depends(get_db)) -> Any:
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="The user with this email does not exist.")

    password_reset_token = security.create_access_token(user.email, expires_delta=timedelta(minutes=30))
    success, message = send_recovery_email(email_to=user.email, token=password_reset_token)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": "Recovery email sent."}


@router.post("/reset-password")
def reset_password(request: PasswordReset, db: Session = Depends(get_db)) -> Any:
    try:
        payload = jwt.decode(request.token, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=400, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = security.get_password_hash(request.new_password)
    db.add(user)
    db.commit()
    return {"message": "Password updated successfully."}
