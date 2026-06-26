from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Ranking, User
from app.schemas import RankingCreate
from app.services.ranking_service import target_exists, update_target_average_rank

router = APIRouter()


@router.post("/rank")
def rank_item(
    payload: RankingCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    if not target_exists(db, payload.type, payload.target_id):
        raise HTTPException(status_code=404, detail="Ranking target not found")

    existing = (
        db.query(Ranking)
        .filter(Ranking.type == payload.type, Ranking.target_id == payload.target_id, Ranking.user_id == user.id)
        .first()
    )
    if existing:
        existing.rank = payload.rank
        db.commit()
        db.refresh(existing)
        update_target_average_rank(db, payload.type, payload.target_id)
        return {"id": existing.id, "type": existing.type, "target_id": existing.target_id, "rank": existing.rank}

    ranking = Ranking(**payload.model_dump(), user_id=user.id)
    db.add(ranking)
    db.commit()
    db.refresh(ranking)
    update_target_average_rank(db, payload.type, payload.target_id)
    return {"id": ranking.id, "type": ranking.type, "target_id": ranking.target_id, "rank": ranking.rank}
