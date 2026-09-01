from typing import Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import settings
from ..core.plans import PLAN_PRICES
from ..database import get_db
from .deps import get_current_active_admin, get_current_organization, require_write_access

router = APIRouter()

PLAN_MAP = {
    "starter": "stripe_price_starter",
    "pro": "stripe_price_pro",
    "business": "stripe_price_business",
}


class CheckoutRequest(BaseModel):
    plan: str


def _stripe_client():
    if not settings.stripe_enabled:
        raise HTTPException(status_code=503, detail="Billing is not configured")
    stripe.api_key = settings.stripe_secret_key
    return stripe


@router.post("/checkout")
def create_checkout_session(
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    org=Depends(get_current_organization),
    _admin=Depends(get_current_active_admin),
) -> Any:
    if body.plan not in PLAN_MAP:
        raise HTTPException(status_code=400, detail="Invalid plan")

    price_id = getattr(settings, PLAN_MAP[body.plan], "")
    if not price_id:
        raise HTTPException(status_code=503, detail=f"Stripe price not configured for {body.plan}")

    client = _stripe_client()
    if not org.stripe_customer_id:
        customer = client.Customer.create(name=org.name, metadata={"organization_id": str(org.id)})
        org.stripe_customer_id = customer.id
        db.add(org)
        db.commit()

    session = client.checkout.Session.create(
        mode="subscription",
        customer=org.stripe_customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.frontend_url.rstrip('/')}/app?billing=success",
        cancel_url=f"{settings.frontend_url.rstrip('/')}/pricing?billing=canceled",
        metadata={"organization_id": str(org.id), "plan": body.plan},
    )
    return {"checkout_url": session.url}


@router.post("/portal")
def create_portal_session(
    db: Session = Depends(get_db),
    org=Depends(get_current_organization),
    _admin=Depends(get_current_active_admin),
) -> Any:
    if not org.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")
    client = _stripe_client()
    session = client.billing_portal.Session.create(
        customer=org.stripe_customer_id,
        return_url=f"{settings.frontend_url.rstrip('/')}/app",
    )
    return {"portal_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)) -> Any:
    if not settings.stripe_enabled or not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhooks not configured")

    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    from ..models import Organization

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        org_id = int(data.get("metadata", {}).get("organization_id", 0))
        plan = data.get("metadata", {}).get("plan", "starter")
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if org:
            org.plan = plan
            org.status = "active"
            org.stripe_subscription_id = data.get("subscription")
            db.add(org)
            db.commit()

    elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        customer_id = data.get("customer")
        org = db.query(Organization).filter(Organization.stripe_customer_id == customer_id).first()
        if org:
            status = data.get("status", "")
            if status in ("active", "trialing"):
                org.status = "active"
            elif status == "past_due":
                org.status = "past_due"
            elif status in ("canceled", "unpaid"):
                org.status = "read_only"
            org.stripe_subscription_id = data.get("id")
            db.add(org)
            db.commit()

    return {"received": True}
