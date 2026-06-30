"""Widen photos.local_path to hold Cloudinary URLs."""

from alembic import op
import sqlalchemy as sa

revision = "0003_photo_local_path_width"
down_revision = "0002_ranking_user_id_and_on_delete"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("photos", "local_path", type_=sa.String(500))


def downgrade() -> None:
    op.alter_column("photos", "local_path", type_=sa.String(255))
