import secrets
from typing import Annotated
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_user
from app.models import Asana, Photo, User
from app.schemas import PhotoCreate, PhotoOut
from app.services.activity_service import log_activity
from app.services.cloudinary_service import delete_image, extract_public_id, upload_image

router = APIRouter()
REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_ROOT = (REPO_ROOT / "data").resolve()
UPLOAD_ROOT = REPO_ROOT / "data" / "uploads" / "asanas"

_MAGIC_BYTES = {
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
    ".png": b"\x89PNG\r\n\x1a\n",
    ".webp": b"RIFF",
}


def _validate_magic_bytes(content: bytes, ext: str) -> None:
    expected = _MAGIC_BYTES.get(ext)
    if not expected:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    if ext == ".webp":
        if len(content) < 12 or content[8:12] != b"WEBP":
            raise HTTPException(status_code=400, detail="Invalid WebP file")
    elif not content.startswith(expected):
        raise HTTPException(status_code=400, detail="File content does not match extension")


def _allowed_roots() -> list[Path]:
    roots = [DATA_ROOT]
    images_root = get_settings().asanas_images_path
    if images_root:
        roots.append(images_root)
    return roots


def _safe_photo_path(stored: str) -> Path:
    path = Path(stored).expanduser().resolve()
    if not any(path.is_relative_to(root) for root in _allowed_roots()):
        raise HTTPException(status_code=403, detail="Invalid photo path")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Photo file missing")
    return path


@router.get("", response_model=list[PhotoOut])
def list_photos(
    db: Annotated[Session, Depends(get_db)],
    asana_id: int | None = None,
    limit: int = 100,
    _admin=Depends(get_current_admin),
) -> list[Photo]:
    query = db.query(Photo)
    if asana_id is not None:
        query = query.filter(Photo.asana_id == asana_id)
    return query.order_by(Photo.rank.desc()).limit(limit).all()


@router.get("/by-asana/{asana_id}", response_model=list[PhotoOut])
def photos_by_asana(asana_id: int, db: Annotated[Session, Depends(get_db)]) -> list[Photo]:
    return db.query(Photo).filter(Photo.asana_id == asana_id).order_by(Photo.rank.desc()).all()


@router.get("/{photo_id}", response_model=PhotoOut)
def get_photo(photo_id: int, db: Annotated[Session, Depends(get_db)]) -> Photo:
    item = db.query(Photo).filter(Photo.id == photo_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Photo not found")
    return item


@router.get("/{photo_id}/file")
def serve_photo_file(photo_id: int, db: Annotated[Session, Depends(get_db)]):
    item = db.query(Photo).filter(Photo.id == photo_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Photo not found")
    if item.local_path.startswith("http"):
        return RedirectResponse(url=item.local_path)
    path = _safe_photo_path(item.local_path)
    media = "image/jpeg"
    suffix = path.suffix.lower()
    if suffix == ".png":
        media = "image/png"
    elif suffix == ".webp":
        media = "image/webp"
    elif suffix == ".gif":
        media = "image/gif"
    return FileResponse(path, media_type=media)


@router.post("/upload", response_model=PhotoOut, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    asana_id: Annotated[int, Form(...)],
    rank: int = Form(50),
    file: UploadFile = File(...),
) -> Photo:
    asana = db.query(Asana).filter(Asana.id == asana_id).first()
    if not asana:
        raise HTTPException(status_code=404, detail="Asana not found")

    raw_name = Path(file.filename or "").name
    ext = Path(raw_name).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    _validate_magic_bytes(content, ext)

    filename = f"user-{user.id}-{secrets.token_hex(8)}"

    settings = get_settings()
    if settings.cloudinary_cloud_name:
        stored_path = upload_image(content, folder=str(asana_id), filename=filename)
    else:
        asana_dir = UPLOAD_ROOT / str(asana_id)
        asana_dir.mkdir(parents=True, exist_ok=True)
        local_file = asana_dir / f"{filename}{ext}"
        local_file.write_bytes(content)
        stored_path = str(local_file)

    item = Photo(
        type="upload",
        asana_id=asana_id,
        user_id=user.id,
        local_path=stored_path,
        original_url=None,
        rank=rank,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    ip = request.client.host if request.client else None
    log_activity(db, user.id, "upload", "photo", item.id, {"asana_id": asana_id}, ip)
    return item


@router.post("/create", response_model=PhotoOut, status_code=status.HTTP_201_CREATED)
def create_photo_record(
    payload: PhotoCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> Photo:
    asana = db.query(Asana).filter(Asana.id == payload.asana_id).first()
    if not asana:
        raise HTTPException(status_code=404, detail="Asana not found")

    item = Photo(**payload.model_dump(), user_id=_admin.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{photo_id}")
def delete_photo(request: Request, photo_id: int, db: Annotated[Session, Depends(get_db)], _admin=Depends(get_current_admin)) -> dict:
    item = db.query(Photo).filter(Photo.id == photo_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Photo not found")
    if item.local_path.startswith("http"):
        public_id = extract_public_id(item.local_path)
        if public_id:
            delete_image(public_id)
    else:
        try:
            path = Path(item.local_path)
            if path.is_file():
                path.unlink()
        except OSError:
            pass
    db.delete(item)
    db.commit()
    ip = request.client.host if request.client else None
    log_activity(db, _admin.id, "delete", "photo", photo_id, None, ip)
    return {"ok": True}
