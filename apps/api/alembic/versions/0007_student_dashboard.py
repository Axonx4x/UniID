"""student_dashboard

Revision ID: 0007_student_dashboard
Revises: 0006_staff_imports
Create Date: 2026-10-18 12:35:00+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = "0007_student_dashboard"
down_revision: Union[str, None] = "0006_staff_imports"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add photo_url and phone_number to students table
    op.add_column(
        "students",
        sa.Column("photo_url", sa.String(length=1024), nullable=True),
    )
    op.add_column(
        "students",
        sa.Column("phone_number", sa.String(length=50), nullable=True),
    )

    # 2. Create student_notifications table
    op.create_table(
        "student_notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("institution_id", UUID(as_uuid=True), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=50), server_default="general", nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("action_url", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_student_notifications_user_unread",
        "student_notifications",
        ["user_id", "is_read", "created_at"],
    )

    # 3. Create student_requests table (for correction requests and support enquiries)
    op.create_table(
        "student_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("reference", sa.String(length=50), nullable=False, unique=True),
        sa.Column("institution_id", UUID(as_uuid=True), sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("field_name", sa.String(length=100), nullable=True),
        sa.Column("current_value", sa.String(length=255), nullable=True),
        sa.Column("requested_value", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="pending", nullable=False),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending', 'in_review', 'resolved', 'rejected')",
            name="ck_student_requests_status",
        ),
    )
    op.create_index(
        "ix_student_requests_user_status",
        "student_requests",
        ["user_id", "status"],
    )
    op.create_index(
        "ix_student_requests_institution_status",
        "student_requests",
        ["institution_id", "status"],
    )


def downgrade() -> None:
    op.drop_table("student_requests")
    op.drop_table("student_notifications")
    op.drop_column("students", "phone_number")
    op.drop_column("students", "photo_url")
