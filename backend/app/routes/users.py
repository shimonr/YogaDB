from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models import ActivityLog, PasswordResetToken, Photo, Ranking, RankingLog, User
from app.schemas import UserOut
from app.services.activity_service import client_ip, log_activity
from app.services.ranking_service import update_target_average_rank

router = APIRouter()


@router.get("", response_model=list[UserOut])
def list_users(db: Annotated[Session, Depends(get_db)], _admin=Depends(get_current_admin)) -> list[User]:
    return db.query(User).all()


@router.delete("/{user_id}")
def delete_user(
    request: Request,
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(get_current_admin)],
) -> dict:
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    item = db.query(User).filter(User.id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="User not found")

    # Rows referencing users have no ON DELETE rule, so clear them before deleting the user.
    ranked = db.query(Ranking.type, Ranking.target_id).filter(Ranking.user_id == user_id).all()
    db.query(Ranking).filter(Ranking.user_id == user_id).delete(synchronize_session=False)
    db.query(RankingLog).filter(RankingLog.user_id == user_id).delete(synchronize_session=False)
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete(synchronize_session=False)
    db.query(ActivityLog).filter(ActivityLog.user_id == user_id).update({ActivityLog.user_id: None}, synchronize_session=False)
    db.query(Photo).filter(Photo.user_id == user_id).update({Photo.user_id: None}, synchronize_session=False)
    username = item.username
    db.delete(item)
    db.commit()
    log_activity(db, admin.id, "delete", "user", user_id, {"username": username}, client_ip(request))
    for target_type, target_id in ranked:
        update_target_average_rank(db, target_type, target_id)
    return {"ok": True}
