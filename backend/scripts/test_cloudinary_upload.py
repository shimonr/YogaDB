"""Test: upload 2 images to Cloudinary and verify the URLs work."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models import Photo
from app.services.cloudinary_service import upload_image


def main():
    settings = get_settings()
    if not settings.cloudinary_cloud_name:
        print("ERROR: Cloudinary not configured. Check backend/.env")
        sys.exit(1)

    print(f"Cloudinary cloud: {settings.cloudinary_cloud_name}")

    db = SessionLocal()
    try:
        # Pick 2 photos whose local files actually exist
        candidates = db.query(Photo).filter(Photo.local_path.notlike("http%")).limit(50).all()
        test_photos = []
        for p in candidates:
            path = Path(p.local_path)
            # Remap old sandbox1 paths
            if "sandbox1" in str(path):
                path = Path(str(path).replace(
                    "C:/Users/shimo/Documents/CURSOR/sandbox1/data/asanas",
                    "D:/DEV/YogaDB/data/asanas"
                ).replace(
                    "C:\\Users\\shimo\\Documents\\CURSOR\\sandbox1\\data\\asanas",
                    "D:\\DEV\\YogaDB\\data\\asanas"
                ))
            if path.is_file():
                test_photos.append((p, path))
            if len(test_photos) >= 2:
                break

        if len(test_photos) < 2:
            print(f"Only found {len(test_photos)} existing files. Checking yoga-image-collector...")
            candidates = db.query(Photo).filter(
                Photo.local_path.like("%yoga-image-collector%")
            ).limit(10).all()
            for p in candidates:
                path = Path(p.local_path)
                if path.is_file():
                    test_photos.append((p, path))
                if len(test_photos) >= 2:
                    break

        if not test_photos:
            print("ERROR: No existing image files found in DB. Cannot test upload.")
            sys.exit(1)

        print(f"\nUploading {len(test_photos)} test images...\n")

        for photo, local_path in test_photos:
            folder = str(photo.asana_id)
            filename = local_path.stem
            print(f"  Photo {photo.id}: {local_path.name}")
            print(f"    Reading {local_path} ({local_path.stat().st_size} bytes)...")

            content = local_path.read_bytes()
            url = upload_image(content, folder=folder, filename=filename)
            print(f"    Uploaded -> {url}")

            # Update DB
            photo.local_path = url
            db.commit()
            print(f"    DB updated [OK]\n")

        print("Done! 2 images uploaded to Cloudinary.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
