import cloudinary
import cloudinary.uploader

from app.core.config import get_settings

_settings = get_settings()

if _settings.cloudinary_cloud_name:
    cloudinary.config(
        cloud_name=_settings.cloudinary_cloud_name,
        api_key=_settings.cloudinary_api_key,
        api_secret=_settings.cloudinary_api_secret,
        secure=True,
    )


def upload_image(file_bytes: bytes, folder: str, filename: str) -> str:
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=f"yogadb/{folder}",
        public_id=filename,
        resource_type="image",
    )
    return result["secure_url"]


def delete_image(public_id: str) -> bool:
    try:
        cloudinary.uploader.destroy(public_id)
        return True
    except Exception:
        return False


def extract_public_id(url: str) -> str | None:
    # URL format: https://res.cloudinary.com/{cloud}/image/upload/v{ver}/yogadb/{folder}/{filename}
    if "cloudinary.com" not in url:
        return None
    parts = url.split("/")
    try:
        upload_idx = parts.index("upload")
    except ValueError:
        return None
    # Everything after upload/v{version} (or just upload/) is the public_id (minus extension)
    remaining = "/".join(parts[upload_idx + 1 :])
    # Strip version prefix if present (e.g. "v1234567890/...")
    if remaining.startswith("v") and "/" in remaining:
        remaining = remaining.split("/", 1)[1]
    # Remove file extension
    if "." in remaining:
        remaining = remaining.rsplit(".", 1)[0]
    return remaining
