"""Load asana inventory from CSV and match photos from a yoga-image-collector layout."""

from __future__ import annotations

import csv
import re
import unicodedata
from pathlib import Path

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
                "local_path": str(image_path.resolve()),
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
