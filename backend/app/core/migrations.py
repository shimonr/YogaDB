from pathlib import Path

from alembic.config import Config

from alembic import command

_BACKEND_DIR = Path(__file__).resolve().parents[2]


def upgrade_database() -> None:
    """Apply Alembic migrations up to head for the configured DATABASE_URL."""
    config = Config(str(_BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(_BACKEND_DIR / "alembic"))
    config.attributes["configure_logger"] = False  # keep the host process's logging setup
    command.upgrade(config, "head")
