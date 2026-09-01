"""initial saas schema

Revision ID: 001_saas_foundation
Revises:
Create Date: 2026-09-01
"""

from alembic import op
import sqlalchemy as sa

revision = "001_saas_foundation"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("plan", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("stripe_customer_id", sa.String(length=255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_organizations_id"), "organizations", ["id"], unique=False)
    op.create_index(op.f("ix_organizations_slug"), "organizations", ["slug"], unique=True)
    op.create_index(op.f("ix_organizations_stripe_customer_id"), "organizations", ["stripe_customer_id"], unique=False)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("role", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_organization_id"), "users", ["organization_id"], unique=False)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=False)

    op.create_table(
        "invitations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("token", sa.String(length=255), nullable=False),
        sa.Column("accepted", sa.Boolean(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )

    for table, extra_cols in [
        ("products", [
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("sku", sa.String(length=100), nullable=False),
            sa.Column("category", sa.String(length=100), nullable=False),
            sa.Column("price_purchase", sa.Float(), nullable=False),
            sa.Column("price_sale", sa.Float(), nullable=False),
            sa.Column("unit", sa.String(length=50), nullable=False),
            sa.Column("stock", sa.Integer(), nullable=False),
            sa.Column("min_stock", sa.Integer(), nullable=False),
            sa.Column("location", sa.String(length=255), nullable=True),
            sa.Column("expiration_date", sa.Date(), nullable=True),
            sa.Column("archived", sa.Boolean(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        ]),
        ("clients", [
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("identification", sa.String(), nullable=True),
            sa.Column("email", sa.String(), nullable=True),
            sa.Column("phone", sa.String(), nullable=True),
            sa.Column("address", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        ]),
        ("suppliers", [
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("contact_name", sa.String(length=255), nullable=True),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column("phone", sa.String(length=50), nullable=True),
            sa.Column("payment_terms", sa.String(length=100), nullable=True),
            sa.Column("address", sa.String(length=500), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        ]),
    ]:
        cols = [
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=False),
            *extra_cols,
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        ]
        op.create_table(table, *cols)
        op.create_index(f"ix_{table}_organization_id", table, ["organization_id"], unique=False)

    op.create_unique_constraint("uq_org_product_sku", "products", ["organization_id", "sku"])
    op.create_unique_constraint("uq_org_client_identification", "clients", ["organization_id", "identification"])

    # Remaining tables simplified - create_all handles dev; migration covers core tenant tables
    # For production run: alembic upgrade head after reviewing full schema


def downgrade() -> None:
    for table in ["suppliers", "clients", "products", "invitations", "users", "organizations"]:
        op.drop_table(table)
