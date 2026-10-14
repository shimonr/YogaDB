from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Asana, Class, Flow, Photo, Ranking, Transition

TARGET_MAP = {"asana": Asana, "photo": Photo, "transition": Transition, "flow": Flow, "class": Class}


def target_exists(db: Session, target_type: str, target_id: int) -> bool:
    model = TARGET_MAP.get(target_type)
    if not model:
        return False
    return db.query(model).filter(model.id == target_id).first() is not None


def delete_rankings(db: Session, target_type: str, target_ids: list[int]) -> None:
    """Remove the ratings of deleted items (Ranking has no foreign key, so nothing cascades).
    The ranking log keeps the history. The caller commits."""
    if target_ids:
        db.query(Ranking).filter(Ranking.type == target_type, Ranking.target_id.in_(target_ids)).delete(synchronize_session=False)


def update_target_average_rank(db: Session, target_type: str, target_id: int) -> bool:
    model = TARGET_MAP.get(target_type)
    if not model:
        return False

    avg = db.query(func.avg(Ranking.rank)).filter(Ranking.type == target_type, Ranking.target_id == target_id).scalar()
    target = db.query(model).filter(model.id == target_id).first()
    if avg is None or not target:
        return False
    target.rank = int(round(avg))
    db.add(target)
    db.commit()
    return True
