"""One-time migration: upload local images to Cloudinary and update DB records.

Usage:
    Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET env vars.
    python scripts/migrate_to_cloudinary.py
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.models import Photo  # noqa: E402
from app.services.cloudinary_service import upload_image  # noqa: E402

PATH_REMAPS = [
    ("C:/Users/shimo/Documents/CURSOR/sandbox1/data/asanas", "D:/DEV/YogaDB/data/asanas"),
    ("C:\\Users\\shimo\\Documents\\CURSOR\\sandbox1\\data\\asanas", "D:\\DEV\\YogaDB\\data\\asanas"),
]

BATCH_SIZE = 50


def _remap_path(raw: str) -> Path:
    for old, new in PATH_REMAPS:
        if raw.startswith(old):
            return Path(raw.replace(old, new, 1))
    return Path(raw)


def migrate() -> None:
    settings = get_settings()
    if not settings.cloudinary_cloud_name:
        print("ERROR: Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET env vars first.")
        sys.exit(1)

    db = SessionLocal()
    try:
        photos = db.query(Photo).filter(Photo.local_path.notlike("http%")).all()
        total = len(photos)
        print(f"Found {total} photos with local paths to migrate.")

        migrated = 0
        skipped = 0
        failed = 0
        batch_count = 0
        start = time.time()

        for i, photo in enumerate(photos):
            local_path = _remap_path(photo.local_path)
            if not local_path.is_file():
                skipped += 1
                continue

            folder = str(photo.asana_id)
            filename = local_path.stem

            try:
                content = local_path.read_bytes()
                url = upload_image(content, folder=folder, filename=filename)
                photo.local_path = url
                migrated += 1
                batch_count += 1
            except Exception as e:
                failed += 1
                print(f"  FAIL: photo {photo.id} - {e}")

            if batch_count >= BATCH_SIZE:
                db.commit()
                batch_count = 0
                elapsed = time.time() - start
                rate = migrated / elapsed if elapsed > 0 else 0
                remaining = (total - i - 1) / rate if rate > 0 else 0
                print(f"  [{migrated}/{total}] {skipped} skipped, {failed} failed | {rate:.1f}/s | ETA {remaining/60:.0f}m")

        db.commit()
        elapsed = time.time() - start
        print(f"\nDone in {elapsed/60:.1f}m: {migrated} migrated, {skipped} skipped, {failed} failed.")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
