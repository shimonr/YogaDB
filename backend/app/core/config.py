import secrets
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load backend/.env regardless of process working directory (portable after move).
_BACKEND_DIR = Path(__file__).resolve().parents[2]
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    app_name: str = "Yoga DB API"
    env: str = "development"
    debug: bool = False
    secret_key: str = secrets.token_hex(32)
    access_token_expire_minutes: int = 60
    database_url: str = "sqlite:///./yogadb.db"
    cors_origins: str = "http://localhost:5173"
    asanas_images_dir: str | None = None
    asanas_csv_path: str | None = None
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.is_file() else None,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def asanas_images_path(self) -> Path | None:
        if not self.asanas_images_dir:
            return None
        return Path(self.asanas_images_dir).expanduser().resolve()

    @property
    def asanas_csv_file(self) -> Path | None:
        if not self.asanas_csv_path:
            return None
        return Path(self.asanas_csv_path).expanduser().resolve()

    @property
    def cors_origins_list(self) -> list[str]:
        return [i.strip() for i in self.cors_origins.split(",") if i.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
