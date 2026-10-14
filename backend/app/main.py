import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_ADMIN_PASSWORD, get_settings
from app.core.database import SessionLocal
from app.core.migrations import upgrade_database
from app.core.security import get_password_hash
from app.models import Asana, User
from app.routes import admin, asanas, auth, classes, flows, photos, ranking, transitions, users

logger = logging.getLogger(__name__)
settings = get_settings()


def _add_asanas(db: Session) -> int:
    csv_path = settings.asanas_csv_file
    if not csv_path or not csv_path.is_file():
        logger.info("No asana CSV at %s — skipping asana import.", csv_path)
        return 0
    if db.query(Asana).first() is not None:
        return 0

    from app.services.asana_import import load_payload, upsert_asanas

    images_dir = settings.asanas_images_path
    if not images_dir or not images_dir.is_dir():
        logger.warning("Images dir %s not found — loading asanas without photos.", images_dir)
    payload = load_payload(csv_path, images_dir)
    upsert_asanas(db, payload)
    return len(payload)


def _add_admin(db: Session) -> None:
    if settings.is_production and settings.admin_password == DEFAULT_ADMIN_PASSWORD:
        logger.error("ADMIN_PASSWORD is not set — not creating the default admin user in production.")
        return
    db.add(
        User(
            username="shimon",
            email=settings.admin_email,
            password_hash=get_password_hash(settings.admin_password),
            role="admin",
        )
    )
    logger.info("Created admin user: shimon")


def _seed_if_empty() -> None:
    db = SessionLocal()
    try:
        if db.query(User).first() is not None:
            return
        count = _add_asanas(db)
        _add_admin(db)
        db.commit()
        logger.info("Seeded %d asanas.", count)
    except Exception:
        logger.exception("Failed to seed database")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    upgrade_database()
    _seed_if_empty()
    yield


app = FastAPI(title=settings.app_name, version=settings.app_version, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(asanas.router, prefix="/api/asanas", tags=["asanas"])
app.include_router(photos.router, prefix="/api/photos", tags=["photos"])
app.include_router(transitions.router, prefix="/api/transitions", tags=["transitions"])
app.include_router(flows.router, prefix="/api/flows", tags=["flows"])
app.include_router(ranking.router, prefix="/api/ranking", tags=["ranking"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(classes.router, prefix="/api/classes", tags=["classes"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/health")
@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "version": settings.app_version, "commit": settings.app_commit}
