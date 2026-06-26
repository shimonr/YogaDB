"""Add user_id to ranking, ON DELETE rules, and unique constraint.

Revision ID: 0002_ranking_user_id
Revises: 0001_initial
Create Date: 2026-06-26
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_ranking_user_id"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ranking", sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, server_default="1"))
    op.create_index("ix_ranking_user_id", "ranking", ["user_id"])
    op.create_unique_constraint("uq_ranking_per_user", "ranking", ["type", "target_id", "user_id"])
    op.drop_column("ranking", "user_id")
    op.add_column("ranking", sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False))
    op.create_index("ix_ranking_user_id", "ranking", ["user_id"])

    op.execute("ALTER TABLE transitions DROP CONSTRAINT IF EXISTS transitions_start_asana_id_fkey")
    op.execute("ALTER TABLE transitions DROP CONSTRAINT IF EXISTS transitions_end_asana_id_fkey")
    op.create_foreign_key("fk_transitions_start_asana", "transitions", "asanas", ["start_asana_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_transitions_end_asana", "transitions", "asanas", ["end_asana_id"], ["id"], ondelete="CASCADE")

    op.execute("ALTER TABLE flows DROP CONSTRAINT IF EXISTS flows_transition_1_id_fkey")
    op.execute("ALTER TABLE flows DROP CONSTRAINT IF EXISTS flows_transition_2_id_fkey")
    op.execute("ALTER TABLE flows DROP CONSTRAINT IF EXISTS flows_transition_3_id_fkey")
    op.execute("ALTER TABLE flows DROP CONSTRAINT IF EXISTS flows_transition_4_id_fkey")
    op.create_foreign_key("fk_flows_t1", "flows", "transitions", ["transition_1_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_flows_t2", "flows", "transitions", ["transition_2_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_flows_t3", "flows", "transitions", ["transition_3_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_flows_t4", "flows", "transitions", ["transition_4_id"], ["id"], ondelete="CASCADE")

    op.execute("ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_asana_id_fkey")
    op.execute("ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_user_id_fkey")
    op.create_foreign_key("fk_photos_asana", "photos", "asanas", ["asana_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_photos_user", "photos", "users", ["user_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_photos_user", "photos", type_="foreignkey")
    op.drop_constraint("fk_photos_asana", "photos", type_="foreignkey")
    op.create_foreign_key("photos_user_id_fkey", "photos", "users", ["user_id"], ["id"])
    op.create_foreign_key("photos_asana_id_fkey", "photos", "asanas", ["asana_id"], ["id"])

    op.drop_constraint("fk_flows_t4", "flows", type_="foreignkey")
    op.drop_constraint("fk_flows_t3", "flows", type_="foreignkey")
    op.drop_constraint("fk_flows_t2", "flows", type_="foreignkey")
    op.drop_constraint("fk_flows_t1", "flows", type_="foreignkey")
    op.create_foreign_key("flows_transition_4_id_fkey", "flows", "transitions", ["transition_4_id"], ["id"])
    op.create_foreign_key("flows_transition_3_id_fkey", "flows", "transitions", ["transition_3_id"], ["id"])
    op.create_foreign_key("flows_transition_2_id_fkey", "flows", "transitions", ["transition_2_id"], ["id"])
    op.create_foreign_key("flows_transition_1_id_fkey", "flows", "transitions", ["transition_1_id"], ["id"])

    op.drop_constraint("fk_transitions_end_asana", "transitions", type_="foreignkey")
    op.drop_constraint("fk_transitions_start_asana", "transitions", type_="foreignkey")
    op.create_foreign_key("transitions_end_asana_id_fkey", "transitions", "asanas", ["end_asana_id"], ["id"])
    op.create_foreign_key("transitions_start_asana_id_fkey", "transitions", "asanas", ["start_asana_id"], ["id"])

    op.drop_constraint("uq_ranking_per_user", "ranking", type_="unique")
    op.drop_index("ix_ranking_user_id", table_name="ranking")
    op.drop_column("ranking", "user_id")
