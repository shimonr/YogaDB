import os

# Tests must never reach the real Cloudinary account, even when an orb has its keys as secrets.
for _var in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"):
    os.environ.pop(_var, None)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app
from app.models import Asana, Photo, User
from app.routes import auth as auth_module

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_yogadb.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    auth_module._login_failures.clear()
    auth_module._register_attempts.clear()
    auth_module._reset_requests.clear()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    db.add(
        Asana(
            id=1,
            english_name="Mountain Pose",
            sanskrit_name="Tadasana",
            alt_name_1=None,
            alt_name_2=None,
            difficulty_level=1,
            benefits="Posture and grounding",
            is_classic=True,
            type="standing",
            category="focus",
            rank=50,
        )
    )
    db.add(
        Asana(
            id=2,
            english_name="Tree Pose",
            sanskrit_name="Vrksasana",
            alt_name_1=None,
            alt_name_2=None,
            difficulty_level=2,
            benefits="Balance and focus",
            is_classic=True,
            type="standing",
            category="balance",
            rank=60,
        )
    )
    db.add(
        Photo(
            id=1,
            type="download",
            asana_id=1,
            user_id=None,
            local_path="/fake/path/1.jpg",
            original_url="https://example.com/mountain.jpg",
            rank=50,
        )
    )
    db.add(
        Photo(
            id=2,
            type="download",
            asana_id=2,
            user_id=None,
            local_path="/fake/path/2.jpg",
            original_url=None,
            rank=50,
        )
    )
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_headers(client):
    client.post(
        "/api/auth/register",
        json={"username": "admin_user", "email": "admin@example.com", "password": "admin1234"},
    )
    db = TestingSessionLocal()
    user = db.query(User).filter(User.username == "admin_user").first()
    if user:
        user.role = "admin"
        db.commit()
    db.close()
    token_r = client.post("/api/auth/login", data={"username": "admin_user", "password": "admin1234"})
    token = token_r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_headers(client):
    client.post(
        "/api/auth/register",
        json={"username": "regular_user", "email": "user@example.com", "password": "user12345"},
    )
    token_r = client.post("/api/auth/login", data={"username": "regular_user", "password": "user12345"})
    token = token_r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def images_dir(tmp_path, monkeypatch):
    """Point ASANAS_IMAGES_DIR at a temporary folder for the duration of a test."""
    from app.core.config import get_settings

    monkeypatch.setenv("ASANAS_IMAGES_DIR", str(tmp_path))
    get_settings.cache_clear()
    yield tmp_path
    get_settings.cache_clear()
