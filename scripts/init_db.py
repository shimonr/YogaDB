"""Create schema and load asanas + photos from CSV inventory and image folders.

Expected layout (from yoga-image-collector):

  <ASANAS_IMAGES_DIR>/
    Mountain_Pose/
      Mountain_Pose_01.jpg
      ...
    reference.csv          # optional — used for original_url on photos

Asana metadata comes from <ASANAS_CSV_PATH> (yoga_asanas.csv by default).

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

from app.core.database import Base, SessionLocal, engine
from app.core.security import get_password_hash
from app.models import Asana, Photo, User
from app.services.asana_import import build_asana_payload


def _load_backend_dotenv() -> None:
    env_path = ROOT / "backend" / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Initialize Yoga DB from CSV inventory and image folders.")
    parser.add_argument(
        "--csv-path",
        default=os.environ.get("ASANAS_CSV_PATH"),
        help="Path to the asana inventory CSV (or set ASANAS_CSV_PATH).",
    )
    parser.add_argument(
        "--images-dir",
        default=os.environ.get("ASANAS_IMAGES_DIR"),
        help="Path to the root folder containing asana image subfolders (or set ASANAS_IMAGES_DIR).",
    )
    return parser.parse_args()


def main() -> None:
    _load_backend_dotenv()
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

    csv_path = Path(args.csv_path).expanduser().resolve()
    images_dir = Path(args.images_dir).expanduser().resolve()
    os.environ["ASANAS_CSV_PATH"] = str(csv_path)
    os.environ["ASANAS_IMAGES_DIR"] = str(images_dir)

    payload = build_asana_payload(csv_path, images_dir)
    with_photos = sum(1 for item in payload if item.get("photos"))

    Base.metadata.create_all(bind=engine)

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

            db.query(Photo).filter(Photo.asana_id == asana.id, Photo.user_id.is_(None)).delete()
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
                password_hash=get_password_hash("adm"),
                role="admin",
            )
            db.add(admin)
        else:
            admin.role = "admin"
            admin.password_hash = get_password_hash("adm")

        db.commit()
        print(f"Loaded {len(payload)} asanas from {csv_path}")
        print(f"Matched photos for {with_photos} asanas under {images_dir}")
        print("Database initialized with asanas, photos, and admin user (shimon / adm).")
        print(f"Ensure backend/.env contains:")
        print(f"  ASANAS_CSV_PATH={csv_path}")
        print(f"  ASANAS_IMAGES_DIR={images_dir}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
