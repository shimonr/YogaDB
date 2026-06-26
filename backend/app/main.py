import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import get_password_hash
from app.models import Asana, Photo, User
from app.routes import asanas, auth, flows, photos, ranking, transitions, users

logger = logging.getLogger(__name__)
settings = get_settings()


def _seed_if_empty() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).first() is not None:
            return

        csv_path = settings.asanas_csv_file
        images_dir = settings.asanas_images_path
        if not csv_path or not csv_path.is_file():
            logger.info("No CSV found at %s — creating admin user only.", csv_path)
            db.add(
                User(
                    username="shimon",
                    email="shimon@example.com",
                    password_hash=get_password_hash("adm"),
                    role="admin",
                )
            )
            db.commit()
            logger.info("Created admin user: shimon / adm")
            return

        if not images_dir or not images_dir.is_dir():
            logger.warning("Images dir %s not found — loading asanas without photos.", images_dir)
            images_dir = None

        from app.services.asana_import import build_asana_payload

        payload = build_asana_payload(csv_path, images_dir or Path("."))
        for item in payload:
            asana = Asana(
                id=item["id"],
                english_name=item["english_name"],
                sanskrit_name=item["sanskrit_name"],
                alt_name_1=item.get("alternative_name_1"),
                alt_name_2=item.get("alternative_name_2"),
                difficulty_level=item["difficulty_level"],
                benefits=item["benefits"],
                is_classic=item["is_classic"],
                type=item["type"],
                category=item["category"],
                rank=item.get("rank", 50),
            )
            db.add(asana)
            db.flush()
            for photo in item.get("photos", []):
                db.add(
                    Photo(
                        type=photo.get("type", "download"),
                        asana_id=asana.id,
                        user_id=None,
                        local_path=photo["local_path"],
                        original_url=photo.get("original_url"),
                        rank=photo.get("rank", 50),
                    )
                )

        db.add(
            User(
                username="shimon",
                email="shimon@example.com",
                password_hash=get_password_hash("adm"),
                role="admin",
            )
        )
        db.commit()
        logger.info("Seeded %d asanas and admin user (shimon / adm).", len(payload))
    except Exception:
        logger.exception("Failed to seed database")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _seed_if_empty()
    yield


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(asanas.router, prefix="/api/asanas", tags=["asanas"])
app.include_router(photos.router, prefix="/api/photos", tags=["photos"])
app.include_router(transitions.router, prefix="/api/transitions", tags=["transitions"])
app.include_router(flows.router, prefix="/api/flows", tags=["flows"])
app.include_router(ranking.router, prefix="/api/ranking", tags=["ranking"])
app.include_router(users.router, prefix="/api/users", tags=["users"])


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
