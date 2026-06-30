from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Ranking, RankingLog, User
from app.schemas import RankingCreate
from app.services.activity_service import log_activity
from app.services.ranking_service import target_exists, update_target_average_rank

router = APIRouter()


@router.post("/rank")
def rank_item(
    request: Request,
    payload: RankingCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    if not target_exists(db, payload.type, payload.target_id):
        raise HTTPException(status_code=404, detail="Ranking target not found")

    old_rank = None
    existing = (
        db.query(Ranking)
        .filter(Ranking.type == payload.type, Ranking.target_id == payload.target_id, Ranking.user_id == user.id)
        .first()
    )
    if existing:
        old_rank = existing.rank
        existing.rank = payload.rank
        db.commit()
        db.refresh(existing)
        update_target_average_rank(db, payload.type, payload.target_id)
    else:
        ranking = Ranking(**payload.model_dump(), user_id=user.id)
        db.add(ranking)
        db.commit()
        db.refresh(ranking)
        update_target_average_rank(db, payload.type, payload.target_id)
        existing = ranking

    db.add(RankingLog(
        user_id=user.id,
        type=payload.type,
        target_id=payload.target_id,
        old_rank=old_rank,
        new_rank=payload.rank,
    ))
    db.commit()

    ip = request.client.host if request.client else None
    log_activity(db, user.id, "rank", payload.type, payload.target_id, {"old": old_rank, "new": payload.rank}, ip)

    return {"id": existing.id, "type": existing.type, "target_id": existing.target_id, "rank": existing.rank}
