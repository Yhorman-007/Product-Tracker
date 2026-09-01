from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..config import settings
from ..core.plans import PLAN_LIMITS, PLAN_PRICES, get_plan_limits
from ..database import get_db
from ..schemas.organization import Organization as OrganizationSchema
from .deps import get_current_active_admin, get_current_organization

router = APIRouter()


@router.get("/me", response_model=OrganizationSchema)
def get_my_organization(org=Depends(get_current_organization)) -> Any:
    return org


@router.get("/plans")
def list_plans() -> Any:
    return {
        "plans": {
            name: {
                "limits": {
                    "max_users": limits.max_users,
                    "max_products": limits.max_products,
                    "exports": limits.exports,
                    "multi_branch": limits.multi_branch,
                },
                "pricing": PLAN_PRICES.get(name),
            }
            for name, limits in PLAN_LIMITS.items()
        }
    }


@router.get("/usage")
def get_usage(
    db: Session = Depends(get_db),
    org=Depends(get_current_organization),
    _admin=Depends(get_current_active_admin),
) -> Any:
    from ..models import Product, User

    limits = get_plan_limits(org.plan)
    return {
        "plan": org.plan,
        "status": org.status,
        "trial_ends_at": org.trial_ends_at,
        "users": db.query(User).filter(User.organization_id == org.id).count(),
        "max_users": limits.max_users,
        "products": db.query(Product).filter(Product.organization_id == org.id).count(),
        "max_products": limits.max_products,
        "exports_enabled": limits.exports,
    }
