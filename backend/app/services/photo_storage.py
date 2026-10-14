"""Where photo files live on disk and how their paths are stored in the database.

Paths are stored relative to the asana images folder or to the repo's data/ folder, so the
database keeps working after the project or the images folder moves. Absolute paths written by
older versions still resolve as long as they point inside one of those folders.
"""

import hashlib
import os
from pathlib import Path

from PIL import Image, ImageOps

from app.core.config import get_settings

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_ROOT = (REPO_ROOT / "data").resolve()
UPLOAD_ROOT = DATA_ROOT / "uploads"
THUMB_ROOT = DATA_ROOT / "cache" / "thumbs"
RESIZABLE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}  # GIFs stay as-is to keep animation


def photo_roots() -> list[Path]:
    images_root = get_settings().asanas_images_path
    return [images_root, DATA_ROOT] if images_root else [DATA_ROOT]


def to_stored_path(path: Path) -> str:
    path = path.resolve()
    for root in photo_roots():
        if path.is_relative_to(root):
            return path.relative_to(root).as_posix()
    return str(path)


def resolve_photo_file(stored: str) -> Path | None:
    """Return the existing file for a stored path, or None if it is missing or outside the photo roots."""
    for root in photo_roots():
        candidate = (root / stored).resolve()  # an absolute `stored` replaces `root`
        if candidate.is_relative_to(root) and candidate.is_file():
            return candidate
    return None


def is_uploaded_file(path: Path) -> bool:
    return path.resolve().is_relative_to(UPLOAD_ROOT)


def thumbnail(path: Path, width: int) -> Path:
    """A WebP copy of `path` at most `width` pixels wide (cached), or `path` if it is already small enough."""
    if path.suffix.lower() not in RESIZABLE_SUFFIXES:
        return path
    stat = path.stat()
    key = hashlib.sha1(f"{path}:{stat.st_mtime_ns}:{stat.st_size}:{width}".encode()).hexdigest()
    target = THUMB_ROOT / key[:2] / f"{key}.webp"
    if target.is_file():
        return target
    with Image.open(path) as image:
        if image.width <= width:
            return path
        image = ImageOps.exif_transpose(image)
        image.thumbnail((width, width * 10))
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(f".{os.getpid()}.tmp")
        image.save(tmp, "WEBP", quality=80)
    tmp.replace(target)
    return target
