from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
from jose import jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
ALGORITHM = settings.algorithm


def create_token(
    subject: Union[str, Any],
    token_type: str,
    expires_delta: Optional[timedelta] = None,
    organization_id: Optional[int] = None,
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        minutes = (
            settings.refresh_token_expire_minutes
            if token_type == "refresh"
            else settings.access_token_expire_minutes
        )
        expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)

    payload = {"exp": expire, "sub": str(subject), "type": token_type}
    if organization_id is not None:
        payload["org"] = organization_id
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    organization_id: Optional[int] = None,
) -> str:
    return create_token(subject, "access", expires_delta, organization_id)


def create_refresh_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    organization_id: Optional[int] = None,
) -> str:
    return create_token(subject, "refresh", expires_delta, organization_id)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
