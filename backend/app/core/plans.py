from dataclasses import dataclass


@dataclass(frozen=True)
class PlanLimits:
    max_users: int
    max_products: int
    exports: bool
    multi_branch: bool


PLAN_LIMITS = {
    "trial": PlanLimits(max_users=5, max_products=200, exports=True, multi_branch=False),
    "starter": PlanLimits(max_users=3, max_products=500, exports=False, multi_branch=False),
    "pro": PlanLimits(max_users=10, max_products=5000, exports=True, multi_branch=False),
    "business": PlanLimits(max_users=50, max_products=50000, exports=True, multi_branch=True),
}

PLAN_PRICES = {
    "starter": {"monthly_usd": 29, "stripe_price_env": "STRIPE_PRICE_STARTER"},
    "pro": {"monthly_usd": 79, "stripe_price_env": "STRIPE_PRICE_PRO"},
    "business": {"monthly_usd": 199, "stripe_price_env": "STRIPE_PRICE_BUSINESS"},
}


def get_plan_limits(plan: str) -> PlanLimits:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["starter"])
