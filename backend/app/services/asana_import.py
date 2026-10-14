"""Load asana inventory from CSV and match photos from a yoga-image-collector layout.

Run `python -m app.services.asana_import` (from backend/, or in the backend container) to
import ASANAS_CSV_PATH + ASANAS_IMAGES_DIR into the configured database.
"""

from __future__ import annotations

import csv
import re
import unicodedata
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import Asana, Photo
from app.services.photo_storage import to_stored_path

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
APOSTROPHE_CHARS = "'`´''‚‛"
HYPHEN_CHARS = "-‐‑‒–—―"


def slugify(value: str) -> str:
    """Match folder names produced by yoga-image-collector."""
    value = value.strip()
    value = value.translate(str.maketrans("", "", APOSTROPHE_CHARS))
    value = re.sub(f"[{re.escape(HYPHEN_CHARS)}\\s]+", "_", value)
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value)
    value = re.sub(r"_+", "_", value)
    return value.strip("_") or "asana"


def _parse_int(value: str | None, default: int) -> int:
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _split_alt_names(raw: str | None) -> tuple[str | None, str | None]:
    if not raw:
        return None, None
    parts = [part.strip() for part in raw.split(";") if part.strip()]
    alt1 = parts[0] if len(parts) > 0 else None
    alt2 = parts[1] if len(parts) > 1 else None
    return alt1, alt2


def _normalize_label(value: str | None, default: str) -> str:
    if not value or not value.strip():
        return default
    return value.strip().lower().replace(" ", "_").replace("-", "_")


def load_reference_urls(images_dir: Path) -> dict[str, str]:
    reference_csv = images_dir / "reference.csv"
    if not reference_csv.is_file():
        return {}

    urls: dict[str, str] = {}
    with reference_csv.open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            file_name = (row.get("file_name") or "").strip()
            url = (row.get("url") or "").strip()
            if file_name and url:
                urls[file_name.replace("\\", "/")] = url
    return urls


def load_asanas_from_csv(csv_path: Path) -> list[dict]:
    if not csv_path.is_file():
        raise FileNotFoundError(f"Asana inventory CSV not found: {csv_path}")

    records: list[dict] = []
    last_error: UnicodeDecodeError | None = None
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            with csv_path.open("r", newline="", encoding=encoding) as handle:
                reader = csv.DictReader(handle)
                if not reader.fieldnames:
                    raise ValueError(f"CSV has no header row: {csv_path}")

                for row_index, row in enumerate(reader, start=1):
                    english_name = (row.get("english_name") or "").strip()
                    if not english_name:
                        continue

                    sanskrit_name = (row.get("sanskrit_name") or english_name).strip()
                    alt1, alt2 = _split_alt_names(row.get("alt_names"))
                    difficulty = _parse_int(row.get("difficulty_score"), 2)
                    pose_type = _normalize_label(row.get("pose_family"), "standing")
                    category = _normalize_label(row.get("primary_category"), "flexibility")
                    benefits = (row.get("benefits") or "").strip().replace(";", ", ")

                    records.append(
                        {
                            "id": row_index,
                            "english_name": english_name,
                            "sanskrit_name": sanskrit_name,
                            "alternative_name_1": alt1,
                            "alternative_name_2": alt2,
                            "difficulty_level": difficulty,
                            "benefits": benefits,
                            "is_classic": row_index <= 84,
                            "type": pose_type,
                            "category": category,
                            "rank": 50,
                        }
                    )
            return records
        except UnicodeDecodeError as exc:
            last_error = exc

    if last_error:
        raise last_error
    return records


def discover_photos_for_asana(
    images_dir: Path,
    english_name: str,
    reference_urls: dict[str, str],
) -> list[dict]:
    folder = images_dir / slugify(english_name)
    if not folder.is_dir():
        return []

    photos: list[dict] = []
    for image_path in sorted(folder.iterdir(), key=lambda p: p.name.lower()):
        if not image_path.is_file() or image_path.suffix.lower() not in IMAGE_SUFFIXES:
            continue

        relative = image_path.relative_to(images_dir).as_posix()
        photos.append(
            {
                "type": "download",
                "local_path": to_stored_path(image_path),
                "original_url": reference_urls.get(relative),
                "rank": 50,
            }
        )
    return photos


def build_asana_payload(csv_path: Path, images_dir: Path) -> list[dict]:
    if not images_dir.is_dir():
        raise FileNotFoundError(f"Asana images directory not found: {images_dir}")

    asanas = load_asanas_from_csv(csv_path)
    if not asanas:
        raise ValueError(f"No asanas found in CSV: {csv_path}")

    reference_urls = load_reference_urls(images_dir)
    for asana in asanas:
        asana["photos"] = discover_photos_for_asana(images_dir, asana["english_name"], reference_urls)

    return asanas


def load_payload(csv_path: Path, images_dir: Path | None) -> list[dict]:
    """Asanas from the CSV, with photos when the images folder exists."""
    if images_dir and images_dir.is_dir():
        return build_asana_payload(csv_path, images_dir)
    return load_asanas_from_csv(csv_path)


def upsert_asanas(db: Session, payload: list[dict]) -> None:
    """Create or update asanas by id and sync their imported photos; user uploads are kept."""
    for item in payload:
        asana = db.get(Asana, item["id"])
        if asana is None:
            # rank is the average of user rankings after creation; a re-import must not reset it.
            asana = Asana(id=item["id"], rank=item.get("rank", 50))
        asana.english_name = item["english_name"]
        asana.sanskrit_name = item["sanskrit_name"]
        asana.alt_name_1 = item.get("alternative_name_1")
        asana.alt_name_2 = item.get("alternative_name_2")
        asana.difficulty_level = item["difficulty_level"]
        asana.benefits = item["benefits"]
        asana.is_classic = item["is_classic"]
        asana.type = item["type"]
        asana.category = item["category"]
        db.add(asana)
        db.flush()

        # Keep existing imported photos (and so their ids, rankings and links) when the file is still
        # there; remove the ones whose files are gone and add the new ones.
        existing = {
            p.local_path: p
            for p in db.query(Photo).filter(Photo.asana_id == asana.id, Photo.type == "download")
        }
        for photo in item.get("photos", []):
            current = existing.pop(photo["local_path"], None)
            if current is not None:
                current.original_url = photo.get("original_url")
                continue
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
        for gone in existing.values():
            db.delete(gone)


def main() -> None:
    from app.core.config import get_settings
    from app.core.database import SessionLocal

    settings = get_settings()
    csv_path, images_dir = settings.asanas_csv_file, settings.asanas_images_path
    if not csv_path or not csv_path.is_file():
        raise SystemExit(f"Asana CSV not found: {csv_path} (set ASANAS_CSV_PATH)")
    payload = load_payload(csv_path, images_dir)
    db = SessionLocal()
    try:
        upsert_asanas(db, payload)
        db.commit()
    finally:
        db.close()
    photos = sum(len(item.get("photos", [])) for item in payload)
    with_photos = sum(1 for item in payload if item.get("photos"))
    print(f"Imported {len(payload)} asanas from {csv_path}")
    print(f"Matched {photos} photos for {with_photos} asanas under {images_dir}")


if __name__ == "__main__":
    main()
