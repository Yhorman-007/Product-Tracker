from sqlalchemy.orm import Session
from ..models import Product, StockMovement


class StockService:
    @staticmethod
    def reduce_stock(
        db: Session,
        product_id: int,
        quantity: int,
        reason: str,
        organization_id: int,
        reference_type: str = "sale",
        reference_id: int = None,
        user_id: int = None,
    ):
        product = (
            db.query(Product)
            .filter(Product.id == product_id, Product.organization_id == organization_id)
            .first()
        )
        if not product:
            raise ValueError(f"Product {product_id} not found")

        if product.stock < quantity:
            raise ValueError(
                f"Insufficient stock for {product.name}. Available: {product.stock}, Requested: {quantity}"
            )

        product.stock -= quantity
        movement = StockMovement(
            organization_id=organization_id,
            product_id=product_id,
            type="SALE" if reference_type == "sale" else "OUT",
            quantity=quantity,
            reason=reason,
            reference_type=reference_type,
            reference_id=reference_id,
            user_id=user_id,
        )
        db.add(movement)
        return product

    @staticmethod
    def increase_stock(
        db: Session,
        product_id: int,
        quantity: int,
        reason: str,
        organization_id: int,
        reference_type: str = "purchase_order",
        reference_id: int = None,
        user_id: int = None,
    ):
        product = (
            db.query(Product)
            .filter(Product.id == product_id, Product.organization_id == organization_id)
            .first()
        )
        if not product:
            raise ValueError(f"Product {product_id} not found")

        product.stock += quantity
        movement = StockMovement(
            organization_id=organization_id,
            product_id=product_id,
            type="IN",
            quantity=quantity,
            reason=reason,
            reference_type=reference_type,
            reference_id=reference_id,
            user_id=user_id,
        )
        db.add(movement)
        return product
