import secrets
from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load backend/.env regardless of process working directory (portable after move).
_BACKEND_DIR = Path(__file__).resolve().parents[2]
_ENV_FILE = _BACKEND_DIR / ".env"

DEFAULT_ADMIN_PASSWORD = "adm"


def _repo_version() -> str:
    """VERSION at the repo root; containers get APP_VERSION from the deploy instead."""
    version_file = _BACKEND_DIR.parent / "VERSION"
    return version_file.read_text().strip() if version_file.is_file() else "dev"


def _resolve(value: str | None) -> Path | None:
    """Resolve a configured path; relative paths are relative to backend/ (where .env lives)."""
    if not value:
        return None
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = _BACKEND_DIR / path
    return path.resolve()


class Settings(BaseSettings):
    app_name: str = "Yoga DB API"
    app_version: str = _repo_version()
    app_commit: str = ""
    env: str = "development"
    debug: bool = False
    secret_key: str = ""
    access_token_expire_minutes: int = 60
    database_url: str = "sqlite:///./yogadb.db"
    cors_origins: str = "http://localhost:5173"
    asanas_images_dir: str | None = None
    asanas_csv_path: str | None = None
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    admin_password: str = DEFAULT_ADMIN_PASSWORD
    admin_email: str = "shimon@example.com"

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.is_file() else None,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @model_validator(mode="after")
    def _check_secret_key(self) -> "Settings":
        if self.is_production:
            # 32+ characters fits both `openssl rand -hex 32` and Render's generated values (44 chars).
            if len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be set to at least 32 random characters in production")
        elif not self.secret_key:
            # Development convenience only: tokens stop working when the process restarts.
            self.secret_key = secrets.token_hex(32)
        return self

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @property
    def asanas_images_path(self) -> Path | None:
        return _resolve(self.asanas_images_dir)

    @property
    def asanas_csv_file(self) -> Path | None:
        return _resolve(self.asanas_csv_path)

    @property
    def cors_origins_list(self) -> list[str]:
        return [i.strip() for i in self.cors_origins.split(",") if i.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
