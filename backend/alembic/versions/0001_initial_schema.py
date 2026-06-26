"""Initial Yoga DB schema.

Revision ID: 0001_initial
Revises:
Create Date: 2026-03-30
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "asanas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("english_name", sa.String(length=120), nullable=False),
        sa.Column("sanskrit_name", sa.String(length=120), nullable=False),
        sa.Column("alt_name_1", sa.String(length=120), nullable=True),
        sa.Column("alt_name_2", sa.String(length=120), nullable=True),
        sa.Column("difficulty_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("benefits", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_classic", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("type", sa.String(length=60), nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False, server_default="50"),
    )
    op.create_index("ix_asanas_english_name", "asanas", ["english_name"])
    op.create_index("ix_asanas_sanskrit_name", "asanas", ["sanskrit_name"])

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="user"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("username"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_username", "users", ["username"])
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "transitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("start_asana_id", sa.Integer(), sa.ForeignKey("asanas.id"), nullable=False),
        sa.Column("end_asana_id", sa.Integer(), sa.ForeignKey("asanas.id"), nullable=False),
        sa.Column("difficulty_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("rank", sa.Integer(), nullable=False, server_default="50"),
    )
    op.create_index("ix_transitions_name", "transitions", ["name"])

    op.create_table(
        "flows",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("transition_1_id", sa.Integer(), sa.ForeignKey("transitions.id"), nullable=False),
        sa.Column("transition_2_id", sa.Integer(), sa.ForeignKey("transitions.id"), nullable=False),
        sa.Column("transition_3_id", sa.Integer(), sa.ForeignKey("transitions.id"), nullable=False),
        sa.Column("transition_4_id", sa.Integer(), sa.ForeignKey("transitions.id"), nullable=False),
        sa.Column("difficulty_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("rank", sa.Integer(), nullable=False, server_default="50"),
    )
    op.create_index("ix_flows_name", "flows", ["name"])

    op.create_table(
        "ranking",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ranking_type", "ranking", ["type"])
    op.create_index("ix_ranking_target_id", "ranking", ["target_id"])

    op.create_table(
        "photos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("asana_id", sa.Integer(), sa.ForeignKey("asanas.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("local_path", sa.String(length=255), nullable=False),
        sa.Column("original_url", sa.String(length=500), nullable=True),
        sa.Column("rank", sa.Integer(), nullable=False, server_default="50"),
    )
    op.create_index("ix_photos_asana_id", "photos", ["asana_id"])


def downgrade() -> None:
    op.drop_index("ix_photos_asana_id", table_name="photos")
    op.drop_table("photos")

    op.drop_index("ix_ranking_target_id", table_name="ranking")
    op.drop_index("ix_ranking_type", table_name="ranking")
    op.drop_table("ranking")

    op.drop_index("ix_flows_name", table_name="flows")
    op.drop_table("flows")

    op.drop_index("ix_transitions_name", table_name="transitions")
    op.drop_table("transitions")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")

    op.drop_index("ix_asanas_sanskrit_name", table_name="asanas")
    op.drop_index("ix_asanas_english_name", table_name="asanas")
    op.drop_table("asanas")
