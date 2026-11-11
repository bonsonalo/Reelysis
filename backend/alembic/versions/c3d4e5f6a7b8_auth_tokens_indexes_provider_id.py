"""auth tokens, email verification, provider media id as text, indexes

Revision ID: c3d4e5f6a7b8
Revises: a1b2c3d4e5f6
Create Date: 2026-11-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEXES = [
    ("ix_auth_sessions_user_id", "auth_sessions", ["user_id"]),
    ("ix_external_tokens_user_id", "external_tokens", ["user_id"]),
    ("ix_instagram_accounts_user_id", "instagram_accounts", ["user_id"]),
    ("ix_media_items_user_id_published_at", "media_items", ["user_id", "published_at"]),
    ("ix_media_items_user_id_external_media_id", "media_items", ["user_id", "external_media_id"]),
    ("ix_media_metrics_media_item_id_captured_at", "media_metrics", ["media_item_id", "captured_at"]),
    ("ix_competitor_accounts_user_id", "competitor_accounts", ["user_id"]),
    ("ix_competitior_media_competitor_account_id", "competitior_media", ["competitor_account_id"]),
    ("ix_competitior_media_user_id", "competitior_media", ["user_id"]),
    ("ix_video_analysis_user_id_media_source", "video_analysis", ["user_id", "media_source"]),
    ("ix_video_analysis_media_item_id", "video_analysis", ["media_item_id"]),
    ("ix_video_analysis_competitor_media_id", "video_analysis", ["competitor_media_id"]),
    ("ix_analysis_jobs_user_id_job_type_created_at", "analysis_jobs", ["user_id", "job_type", "created_at"]),
    ("ix_account_reports_user_id_created_at", "account_reports", ["user_id", "created_at"]),
    ("ix_recommendations_account_report_id", "recommendations", ["account_report_id"]),
]


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(), nullable=True))
    # Accounts created before verification existed are treated as verified.
    op.execute("UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL")

    op.create_table(
        "user_tokens",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("purpose", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("token_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_tokens_user_id", "user_tokens", ["user_id"])
    op.create_index("ix_user_tokens_token_hash", "user_tokens", ["token_hash"])

    # Refresh sessions are now looked up by id and verified with SHA-256; old bcrypt rows can't be
    # verified, so end them (users simply log in again).
    op.execute("UPDATE auth_sessions SET revoked_at = now() WHERE revoked_at IS NULL")

    op.alter_column(
        "competitior_media",
        "provider_media_id",
        type_=sa.VARCHAR(),
        existing_type=sa.UUID(),
        postgresql_using="provider_media_id::text",
        existing_nullable=True,
    )
    op.create_index("ix_competitior_media_provider_media_id", "competitior_media", ["provider_media_id"])

    for name, table, columns in INDEXES:
        op.create_index(name, table, columns)


def downgrade() -> None:
    """Downgrade schema."""
    for name, table, _ in reversed(INDEXES):
        op.drop_index(name, table_name=table)
    op.drop_index("ix_competitior_media_provider_media_id", table_name="competitior_media")
    # Provider ids are not UUIDs; they cannot be cast back, so clear them.
    op.execute("UPDATE competitior_media SET provider_media_id = NULL")
    op.alter_column(
        "competitior_media",
        "provider_media_id",
        type_=sa.UUID(),
        existing_type=sa.VARCHAR(),
        postgresql_using="provider_media_id::uuid",
        existing_nullable=True,
    )
    op.drop_index("ix_user_tokens_token_hash", table_name="user_tokens")
    op.drop_index("ix_user_tokens_user_id", table_name="user_tokens")
    op.drop_table("user_tokens")
    op.drop_column("users", "email_verified_at")
