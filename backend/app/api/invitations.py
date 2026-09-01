from typing import Any, List
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.org_utils import new_invitation_token
from ..core.plans import get_plan_limits
from ..database import get_db
from ..models import Invitation, User
from ..schemas.invitation import Invitation as InvitationSchema, InvitationAccept, InvitationCreate
from ..schemas.user import User as UserSchema
from ..core import security
from .deps import get_current_active_admin, get_current_organization, require_write_access

router = APIRouter()


@router.post("/", response_model=InvitationSchema)
def create_invitation(
    *,
    db: Session = Depends(get_db),
    body: InvitationCreate,
    current_user: User = Depends(get_current_active_admin),
    org=Depends(require_write_access),
) -> Any:
    if body.role not in ("ADMIN", "SUPERVISOR", "CAJERO"):
        raise HTTPException(status_code=400, detail="Invalid role")

    limits = get_plan_limits(org.plan)
    user_count = db.query(User).filter(User.organization_id == org.id).count()
    pending = (
        db.query(Invitation)
        .filter(
            Invitation.organization_id == org.id,
            Invitation.accepted == False,
            Invitation.expires_at > datetime.now(timezone.utc),
        )
        .count()
    )
    if user_count + pending >= limits.max_users:
        raise HTTPException(status_code=402, detail="User limit reached for your plan")

    email = body.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    existing = (
        db.query(Invitation)
        .filter(
            Invitation.organization_id == org.id,
            Invitation.email == email,
            Invitation.accepted == False,
            Invitation.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Pending invitation already exists for this email")

    invite = Invitation(
        organization_id=org.id,
        email=email,
        role=body.role,
        token=new_invitation_token(),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite


@router.get("/", response_model=List[InvitationSchema])
def list_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin),
    org=Depends(get_current_organization),
) -> Any:
    return (
        db.query(Invitation)
        .filter(Invitation.organization_id == org.id)
        .order_by(Invitation.created_at.desc())
        .all()
    )


@router.post("/accept", response_model=UserSchema)
def accept_invitation(body: InvitationAccept, db: Session = Depends(get_db)) -> Any:
    invite = db.query(Invitation).filter(Invitation.token == body.token, Invitation.accepted == False).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invitation")
    if invite.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation expired")

    username = body.username.strip()
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == invite.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        organization_id=invite.organization_id,
        username=username,
        email=invite.email,
        hashed_password=security.get_password_hash(body.password),
        full_name=body.full_name,
        role=invite.role,
        is_active=True,
    )
    invite.accepted = True
    db.add(user)
    db.add(invite)
    db.commit()
    db.refresh(user)
    return user
