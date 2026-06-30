"""Add classes table."""

from alembic import op
import sqlalchemy as sa

revision = "0004_add_classes_table"
down_revision = "0003_photo_local_path_width"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "classes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("flow_ids", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("difficulty_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("rank", sa.Integer(), nullable=False, server_default="50"),
    )
    op.create_index("ix_classes_name", "classes", ["name"])


def downgrade():
    op.drop_index("ix_classes_name", table_name="classes")
    op.drop_table("classes")
