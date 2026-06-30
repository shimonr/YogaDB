"""Add ranking_logs table."""

from alembic import op
import sqlalchemy as sa

revision = "0005_add_ranking_logs"
down_revision = "0004_add_classes_table"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "ranking_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=False),
        sa.Column("old_rank", sa.Integer(), nullable=True),
        sa.Column("new_rank", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ranking_logs_user_id", "ranking_logs", ["user_id"])
    op.create_index("ix_ranking_logs_type", "ranking_logs", ["type"])


def downgrade():
    op.drop_index("ix_ranking_logs_type", table_name="ranking_logs")
    op.drop_index("ix_ranking_logs_user_id", table_name="ranking_logs")
    op.drop_table("ranking_logs")
