"""Reset the QA copy to a clean state: only the admin account, freshly imported asanas and photos,
and the sample transitions/flows/classes. Never available in production (QA_MODE must be on)."""

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import ActivityLog, Asana, Class, Flow, PasswordResetToken, Photo, Ranking, RankingLog, Transition, User
from app.services.asana_import import load_payload, upsert_asanas
from app.services.photo_storage import is_uploaded_file, resolve_photo_file
from app.services.sample_content import seed_sample_content


def reset_qa(db: Session, keep_user_id: int) -> dict[str, dict[str, int]]:
    counts: dict[str, int] = {}
    for model in (RankingLog, Ranking, ActivityLog, PasswordResetToken, Class, Flow, Transition):
        counts[model.__tablename__] = db.query(model).delete(synchronize_session=False)

    uploads = db.query(Photo).filter(Photo.type == "upload").all()
    for photo in uploads:
        path = resolve_photo_file(photo.local_path)
        if path is not None and is_uploaded_file(path):
            path.unlink(missing_ok=True)
        db.delete(photo)
    counts["uploaded_photos"] = len(uploads)
    counts["users"] = db.query(User).filter(User.id != keep_user_id).delete(synchronize_session=False)
    db.query(Asana).update({Asana.rank: 50}, synchronize_session=False)
    db.query(Photo).update({Photo.rank: 50}, synchronize_session=False)
    db.flush()

    settings = get_settings()
    csv_path = settings.asanas_csv_file
    if csv_path and csv_path.is_file():
        upsert_asanas(db, load_payload(csv_path, settings.asanas_images_path))
    created = seed_sample_content(db)
    db.commit()
    return {"removed": counts, "created": created}
