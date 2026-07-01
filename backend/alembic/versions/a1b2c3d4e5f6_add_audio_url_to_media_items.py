"""add audio_url to media_items

Revision ID: a1b2c3d4e5f6
Revises: 0b5d73cbc460
Create Date: 2026-06-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "0b5d73cbc460"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "media_items",
        sa.Column("audio_url", sa.String(), nullable=False, server_default=""),
    )
    op.alter_column("media_items", "audio_url", server_default=None)


def downgrade() -> None:
    op.drop_column("media_items", "audio_url")
