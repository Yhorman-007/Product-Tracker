import re
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from ..models import Organization


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:80] or "org"


def unique_slug(db: Session, name: str) -> str:
    base = slugify(name)
    slug = base
    counter = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base}-{counter}"
        counter += 1
    return slug


def new_invitation_token() -> str:
    return secrets.token_urlsafe(32)


def trial_end_date(days: int = 14) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)
