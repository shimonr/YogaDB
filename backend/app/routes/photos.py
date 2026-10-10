import secrets
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_user
from app.models import Asana, Photo, User
from app.schemas import PhotoCreate, PhotoOut
from app.services.activity_service import log_activity
from app.services.cloudinary_service import delete_image, extract_public_id, upload_image
from app.services.photo_storage import UPLOAD_ROOT, is_uploaded_file, resolve_photo_file, to_stored_path

router = APIRouter()

_MAGIC_BYTES = {
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
    ".png": b"\x89PNG\r\n\x1a\n",
    ".webp": b"RIFF",
}
_MEDIA_TYPES = {".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}


def _is_remote(stored: str) -> bool:
    return stored.startswith(("http://", "https://"))


def _validate_magic_bytes(content: bytes, ext: str) -> None:
    expected = _MAGIC_BYTES.get(ext)
    if not expected:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    if ext == ".webp":
        if len(content) < 12 or content[8:12] != b"WEBP":
            raise HTTPException(status_code=400, detail="Invalid WebP file")
    elif not content.startswith(expected):
        raise HTTPException(status_code=400, detail="File content does not match extension")


@router.get("", response_model=list[PhotoOut])
def list_photos(
    db: Annotated[Session, Depends(get_db)],
    asana_id: int | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    _admin=Depends(get_current_admin),
) -> list[Photo]:
    query = db.query(Photo)
    if asana_id is not None:
        query = query.filter(Photo.asana_id == asana_id)
    return query.order_by(Photo.rank.desc(), Photo.id).offset(skip).limit(limit).all()


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
    if _is_remote(item.local_path):
        return RedirectResponse(url=item.local_path)
    path = resolve_photo_file(item.local_path)
    if path is None:
        raise HTTPException(status_code=404, detail="Photo file missing")
    return FileResponse(path, media_type=_MEDIA_TYPES.get(path.suffix.lower(), "image/jpeg"))


@router.post("/upload", response_model=PhotoOut, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    asana_id: Annotated[int, Form(...)],
    rank: Annotated[int, Form(ge=1, le=100)] = 50,
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
        asana_dir = UPLOAD_ROOT / "asanas" / str(asana_id)
        asana_dir.mkdir(parents=True, exist_ok=True)
        local_file = asana_dir / f"{filename}{ext}"
        local_file.write_bytes(content)
        stored_path = to_stored_path(local_file)

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
    if not _is_remote(payload.local_path) and resolve_photo_file(payload.local_path) is None:
        raise HTTPException(status_code=400, detail="local_path must be an http(s) URL or an existing file under the photo folders")

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
    if _is_remote(item.local_path):
        public_id = extract_public_id(item.local_path)
        if public_id:
            delete_image(public_id)
    else:
        # Only user uploads are owned by the app; imported images are source files and stay on disk.
        path = resolve_photo_file(item.local_path)
        if path is not None and is_uploaded_file(path):
            path.unlink(missing_ok=True)
    db.delete(item)
    db.commit()
    ip = request.client.host if request.client else None
    log_activity(db, _admin.id, "delete", "photo", photo_id, None, ip)
    return {"ok": True}
