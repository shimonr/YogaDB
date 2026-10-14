"""Copy the server's daily backups (database dumps, upload archives) to Cloudinary as private files.

Runs in the backup-offsite container: `python -m app.services.offsite_backup`. Uses its own
BACKUP_CLOUDINARY_* variables so the API itself keeps storing photos on the VM. Files are
uploaded as "authenticated" raw resources (not publicly reachable) under
yogadb-backups/<BACKUP_LABEL>/ and deleted from Cloudinary after KEEP_DAYS.
"""

from __future__ import annotations

import logging
import os
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

import cloudinary
import cloudinary.api
import cloudinary.uploader

logger = logging.getLogger("offsite_backup")
BACKUP_DIR = Path(os.environ.get("OFFSITE_SOURCE_DIR", "/backups"))
KEEP_DAYS = 30
MAX_BYTES = 10 * 1024 * 1024  # Cloudinary free plan limit for raw files


def _prefix() -> str:
    return f"yogadb-backups/{os.environ.get('BACKUP_LABEL', 'yogadb')}"


def configure() -> bool:
    name = os.environ.get("BACKUP_CLOUDINARY_CLOUD_NAME", "").strip().lower()
    key = os.environ.get("BACKUP_CLOUDINARY_API_KEY", "").strip()
    secret = os.environ.get("BACKUP_CLOUDINARY_API_SECRET", "").strip()
    if not (name and key and secret):
        return False
    cloudinary.config(cloud_name=name, api_key=key, api_secret=secret, secure=True)
    return True


def remote_files() -> dict[str, datetime]:
    found: dict[str, datetime] = {}
    cursor = None
    while True:
        options = {"resource_type": "raw", "type": "authenticated", "prefix": _prefix() + "/", "max_results": 500}
        if cursor:
            options["next_cursor"] = cursor
        page = cloudinary.api.resources(**options)
        for item in page["resources"]:
            found[item["public_id"]] = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
        cursor = page.get("next_cursor")
        if not cursor:
            return found


def sync_once() -> dict[str, int]:
    existing = remote_files()
    result = {"uploaded": 0, "skipped_large": 0, "deleted": 0}
    for path in sorted(BACKUP_DIR.glob("*.gz")):
        public_id = f"{_prefix()}/{path.name}"
        if public_id in existing:
            continue
        if path.stat().st_size > MAX_BYTES:
            logger.warning("%s is larger than %d bytes; not copied off-site", path.name, MAX_BYTES)
            result["skipped_large"] += 1
            continue
        cloudinary.uploader.upload(
            str(path), resource_type="raw", type="authenticated", public_id=public_id, overwrite=False
        )
        result["uploaded"] += 1
    cutoff = datetime.now(UTC) - timedelta(days=KEEP_DAYS)
    old = [public_id for public_id, created in existing.items() if created < cutoff]
    if old:
        cloudinary.api.delete_resources(old, resource_type="raw", type="authenticated")
        result["deleted"] = len(old)
    return result


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if not configure():
        logger.info("BACKUP_CLOUDINARY_* not set; off-site backup is off")
        while True:
            time.sleep(86400)
    time.sleep(900)  # let the daily dump finish after a (re)start
    while True:
        try:
            logger.info("off-site backup: %s", sync_once())
        except Exception:  # keep the loop alive; the next run retries
            logger.exception("off-site backup failed")
        time.sleep(6 * 3600)


if __name__ == "__main__":
    main()
