"""Baseline schema matching the SQLAlchemy models.

Replaces the earlier migrations, which no longer matched the models and were never the source of
the deployed schema (the app used Base.metadata.create_all). Tables that already exist are left
untouched, so this revision adopts databases created by create_all as well as creating new ones.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-10-10
"""

import sqlalchemy as sa
from alembic import op

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def _create_table(name: str, *columns_and_constraints, indexes: tuple[tuple[str, list[str], bool], ...] = ()) -> None:
    if sa.inspect(op.get_bind()).has_table(name):
        return
    op.create_table(name, *columns_and_constraints)
    for index_name, columns, unique in indexes:
        op.create_index(index_name, name, columns, unique=unique)


def _created_at() -> sa.Column:
    return sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)


def upgrade() -> None:
    _create_table(
        "asanas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("english_name", sa.String(length=120), nullable=False),
        sa.Column("sanskrit_name", sa.String(length=120), nullable=False),
        sa.Column("alt_name_1", sa.String(length=120), nullable=True),
        sa.Column("alt_name_2", sa.String(length=120), nullable=True),
        sa.Column("difficulty_level", sa.Integer(), nullable=False),
        sa.Column("benefits", sa.Text(), nullable=False),
        sa.Column("is_classic", sa.Boolean(), nullable=False),
        sa.Column("type", sa.String(length=60), nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        indexes=(
            ("ix_asanas_english_name", ["english_name"], False),
            ("ix_asanas_sanskrit_name", ["sanskrit_name"], False),
        ),
    )
    _create_table(
        "classes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("flow_ids", sa.Text(), nullable=False),
        sa.Column("difficulty_level", sa.Integer(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        indexes=(("ix_classes_name", ["name"], False),),
    )
    _create_table(
        "flows",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("transition_ids", sa.Text(), nullable=False),
        sa.Column("difficulty_level", sa.Integer(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        indexes=(("ix_flows_name", ["name"], False),),
    )
    _create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        _created_at(),
        indexes=(
            ("ix_users_email", ["email"], True),
            ("ix_users_username", ["username"], True),
        ),
    )
    _create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("entity_type", sa.String(length=30), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        _created_at(),
    )
    _create_table(
        "photos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("asana_id", sa.Integer(), sa.ForeignKey("asanas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("local_path", sa.String(length=500), nullable=False),
        sa.Column("original_url", sa.String(length=500), nullable=True),
        sa.Column("rank", sa.Integer(), nullable=False),
        indexes=(("ix_photos_asana_id", ["asana_id"], False),),
    )
    _create_table(
        "ranking",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        _created_at(),
        sa.UniqueConstraint("type", "target_id", "user_id", name="uq_ranking_per_user"),
        indexes=(
            ("ix_ranking_target_id", ["target_id"], False),
            ("ix_ranking_type", ["type"], False),
            ("ix_ranking_user_id", ["user_id"], False),
        ),
    )
    _create_table(
        "ranking_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=False),
        sa.Column("old_rank", sa.Integer(), nullable=True),
        sa.Column("new_rank", sa.Integer(), nullable=False),
        _created_at(),
    )
    _create_table(
        "transitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("start_asana_id", sa.Integer(), sa.ForeignKey("asanas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("end_asana_id", sa.Integer(), sa.ForeignKey("asanas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("difficulty_level", sa.Integer(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        indexes=(("ix_transitions_name", ["name"], False),),
    )


def downgrade() -> None:
    for name in ("transitions", "ranking_logs", "ranking", "photos", "activity_logs", "users", "flows", "classes", "asanas"):
        op.drop_table(name)
