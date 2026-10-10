"""Create or upgrade the schema and load asanas + photos from a CSV inventory and image folders.

Expected layout (from yoga-image-collector):

  <ASANAS_IMAGES_DIR>/
    Mountain_Pose/          # folder name = English name with spaces/hyphens as underscores
      Mountain_Pose_01.jpg
      ...
    reference.csv          # optional — used for original_url on photos

Asana metadata comes from <ASANAS_CSV_PATH> (see data/asanas/yoga_asanas.sample.csv).
Defaults come from backend/.env; relative paths there are relative to backend/.

Usage:
  python scripts/init_db.py
  python scripts/init_db.py --csv-path "C:/path/to/yoga_asanas.csv" --images-dir "C:/path/to/asana_images"
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_default_sqlite = ROOT / "backend" / "yogadb.db"
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_default_sqlite.as_posix()}")

sys.path.insert(0, str(ROOT / "backend"))

from app.core.config import get_settings  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.core.migrations import upgrade_database  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.models import Asana, Photo, User  # noqa: E402
from app.services.asana_import import build_asana_payload  # noqa: E402


def parse_args() -> argparse.Namespace:
    settings = get_settings()
    parser = argparse.ArgumentParser(description="Initialize Yoga DB from CSV inventory and image folders.")
    parser.add_argument(
        "--csv-path",
        type=Path,
        default=settings.asanas_csv_file,
        help="Path to the asana inventory CSV (default: ASANAS_CSV_PATH from backend/.env).",
    )
    parser.add_argument(
        "--images-dir",
        type=Path,
        default=settings.asanas_images_path,
        help="Root folder of asana image subfolders (default: ASANAS_IMAGES_DIR from backend/.env).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.csv_path:
        raise SystemExit(
            "Missing CSV path. Pass --csv-path PATH or set ASANAS_CSV_PATH.\n"
            "Example: python scripts/init_db.py --csv-path D:/DEV/yoga-image-collector/input/yoga_asanas.csv"
        )
    if not args.images_dir:
        raise SystemExit(
            "Missing images folder. Pass --images-dir PATH or set ASANAS_IMAGES_DIR.\n"
            "Example: python scripts/init_db.py --images-dir D:/DEV/yoga-image-collector/asana_images"
        )

    csv_path = args.csv_path.expanduser().resolve()
    images_dir = args.images_dir.expanduser().resolve()
    # Photo paths are stored relative to the images folder, so make it the configured one.
    os.environ["ASANAS_IMAGES_DIR"] = str(images_dir)
    get_settings.cache_clear()
    settings = get_settings()

    payload = build_asana_payload(csv_path, images_dir)
    with_photos = sum(1 for item in payload if item.get("photos"))

    upgrade_database()

    db = SessionLocal()
    try:
        for item in payload:
            asana = db.query(Asana).filter(Asana.id == item["id"]).first()
            if asana is None:
                asana = Asana(id=item["id"])
            asana.english_name = item["english_name"]
            asana.sanskrit_name = item["sanskrit_name"]
            asana.alt_name_1 = item.get("alternative_name_1")
            asana.alt_name_2 = item.get("alternative_name_2")
            asana.difficulty_level = item["difficulty_level"]
            asana.benefits = item["benefits"]
            asana.is_classic = item["is_classic"]
            asana.type = item["type"]
            asana.category = item["category"]
            asana.rank = item.get("rank", 50)
            db.add(asana)
            db.flush()

            # Replace imported photos only; user uploads stay even after their uploader is deleted.
            db.query(Photo).filter(Photo.asana_id == asana.id, Photo.type == "download").delete()
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

        admin = db.query(User).filter(User.username == "shimon").first()
        if not admin:
            admin = User(
                username="shimon",
                email="shimon@example.com",
                password_hash=get_password_hash(settings.admin_password),
                role="admin",
            )
            db.add(admin)
        else:
            admin.role = "admin"
            admin.password_hash = get_password_hash(settings.admin_password)

        db.commit()
        print(f"Loaded {len(payload)} asanas from {csv_path}")
        print(f"Matched photos for {with_photos} asanas under {images_dir}")
        print("Database initialized with asanas, photos, and admin user 'shimon' (password: ADMIN_PASSWORD).")
        print("Ensure backend/.env contains:")
        print(f"  ASANAS_CSV_PATH={csv_path}")
        print(f"  ASANAS_IMAGES_DIR={images_dir}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
