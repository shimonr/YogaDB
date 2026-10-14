"""Upload limits that keep YogaDB inside its free-tier allowances.

- Photos stored on the VM: each file at most UPLOAD_MAX_FILE_MB, all uploads together at most
  UPLOADS_MAX_TOTAL_MB, and at least MIN_FREE_DISK_MB left on the disk.
- Cloudinary (photo storage when configured, off-site backups): uploads stop once the plan's
  monthly credits reach CLOUDINARY_MAX_USAGE_PERCENT.
"""

from __future__ import annotations

import logging
import os
import shutil
import time
from pathlib import Path

import cloudinary.api

from app.core.config import get_settings
from app.services import photo_storage

logger = logging.getLogger(__name__)
MB = 1024 * 1024
_CACHE_SECONDS = 600
_usage_cache: tuple[float, dict | None] = (0.0, None)


class StorageLimitReached(Exception):
    """An upload would break a storage limit; the message is safe to show to users."""


def uploads_size_bytes(root: Path | None = None) -> int:
    root = root or photo_storage.UPLOAD_ROOT
    total = 0
    for folder, _dirs, files in os.walk(root):
        for name in files:
            try:
                total += (Path(folder) / name).stat().st_size
            except OSError:
                pass
    return total


def disk_free_bytes(path: Path | None = None) -> int:
    path = path or photo_storage.UPLOAD_ROOT
    while not path.exists():
        path = path.parent
    return shutil.disk_usage(path).free


def check_local_upload(size: int) -> None:
    settings = get_settings()
    if size > settings.upload_max_file_mb * MB:
        raise StorageLimitReached(f"File too large (max {settings.upload_max_file_mb} MB)")
    if uploads_size_bytes() + size > settings.uploads_max_total_mb * MB:
        raise StorageLimitReached("Photo storage is full, so uploads are paused. Please tell the site admin.")
    if disk_free_bytes() - size < settings.min_free_disk_mb * MB:
        raise StorageLimitReached("The server is low on disk space, so uploads are paused. Please tell the site admin.")


def cloudinary_usage(force: bool = False) -> dict | None:
    """Plan credit usage of the configured Cloudinary account (cached), or None if unavailable."""
    global _usage_cache
    checked_at, cached = _usage_cache
    if not force and time.monotonic() - checked_at < _CACHE_SECONDS:
        return cached
    try:
        usage = cloudinary.api.usage()
        credits = usage.get("credits") or {}
        cached = {
            "plan": usage.get("plan"),
            "used_percent": float(credits.get("used_percent", 0.0)),
            "credits_used": credits.get("usage"),
            "credits_limit": credits.get("limit"),
            "storage_mb": round((usage.get("storage") or {}).get("usage", 0) / MB, 1),
        }
    except Exception:  # unreachable or not configured: callers treat None as "don't upload"
        logger.exception("Could not read Cloudinary usage")
        cached = None
    _usage_cache = (time.monotonic(), cached)
    return cached


def check_cloudinary_quota(usage: dict | None = None) -> None:
    usage = usage if usage is not None else cloudinary_usage()
    limit = get_settings().cloudinary_max_usage_percent
    if usage is None:
        raise StorageLimitReached("Cloud photo storage is unavailable right now. Please try again later.")
    if usage["used_percent"] >= limit:
        raise StorageLimitReached("Cloud photo storage has reached its monthly limit, so uploads are paused.")


def status() -> dict:
    settings = get_settings()
    result = {
        "uploads_mb": round(uploads_size_bytes() / MB, 1),
        "uploads_max_total_mb": settings.uploads_max_total_mb,
        "upload_max_file_mb": settings.upload_max_file_mb,
        "disk_free_mb": round(disk_free_bytes() / MB),
        "min_free_disk_mb": settings.min_free_disk_mb,
        "photo_storage": "cloudinary" if settings.cloudinary_cloud_name else "server",
        "cloudinary": None,
    }
    if settings.cloudinary_cloud_name:
        result["cloudinary"] = {**(cloudinary_usage() or {}), "max_usage_percent": settings.cloudinary_max_usage_percent}
    return result
