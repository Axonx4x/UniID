"""Initial institutions table for tenant isolation

Revision ID: 0001_initial
Revises: 
Create Date: 2026-10-14 19:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "institutions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("code", sa.String(length=50), nullable=False, comment="Unique identifier slug (e.g., luanar)"),
        sa.Column("name", sa.String(length=255), nullable=False, comment="Official full university name"),
        sa.Column("short_name", sa.String(length=50), nullable=False, comment="Abbreviated university name"),
        sa.Column("campus", sa.String(length=100), nullable=False, server_default="Main Campus", comment="Campus name"),
        sa.Column("contact_email", sa.String(length=255), nullable=False, comment="Administrative contact email"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("brand_primary_color", sa.String(length=7), nullable=False, server_default="#0B192C"),
        sa.Column("brand_accent_color", sa.String(length=7), nullable=False, server_default="#1E88E5"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_institutions_code"), "institutions", ["code"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_institutions_code"), table_name="institutions")
    op.drop_table("institutions")
