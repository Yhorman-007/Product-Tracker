from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime


class InvitationCreate(BaseModel):
    email: EmailStr
    role: str = "CAJERO"


class InvitationAccept(BaseModel):
    token: str
    username: str
    full_name: Optional[str] = None
    password: str


class Invitation(BaseModel):
    id: int
    email: EmailStr
    role: str
    accepted: bool
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
