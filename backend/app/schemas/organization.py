from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime


class OrganizationBase(BaseModel):
    name: str
    slug: str
    plan: str
    status: str


class Organization(OrganizationBase):
    id: int
    trial_ends_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SignupRequest(BaseModel):
    organization_name: str
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    password: str


class SignupResponse(BaseModel):
    user_id: int
    organization_id: int
    organization_name: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
