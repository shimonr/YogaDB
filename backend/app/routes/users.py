from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models import User
from app.schemas import UserOut

router = APIRouter()


@router.get("", response_model=list[UserOut])
def list_users(db: Annotated[Session, Depends(get_db)], _admin=Depends(get_current_admin)) -> list[User]:
    return db.query(User).all()


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Annotated[Session, Depends(get_db)], _admin=Depends(get_current_admin)) -> dict:
    item = db.query(User).filter(User.id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(item)
    db.commit()
    return {"ok": True}
