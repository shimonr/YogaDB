from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models import Asana
from app.schemas import AsanaBase, AsanaOut

router = APIRouter()


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("", response_model=list[AsanaOut])
def get_asanas(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = Query(default=None),
    type: str | None = Query(default=None),
    category: str | None = Query(default=None),
    difficulty_level: int | None = Query(default=None, ge=1, le=5),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[Asana]:
    query = db.query(Asana)
    if q:
        term = f"%{_escape_like(q.strip())}%"
        query = query.filter(
            or_(
                Asana.english_name.ilike(term),
                Asana.sanskrit_name.ilike(term),
                Asana.alt_name_1.ilike(term),
                Asana.alt_name_2.ilike(term),
                Asana.benefits.ilike(term),
            )
        )
    if type:
        query = query.filter(Asana.type == type)
    if category:
        query = query.filter(Asana.category == category)
    if difficulty_level:
        query = query.filter(Asana.difficulty_level == difficulty_level)
    return query.order_by(Asana.rank.desc()).offset(skip).limit(limit).all()


@router.get("/top", response_model=list[AsanaOut])
def top_asanas(db: Annotated[Session, Depends(get_db)], limit: int = Query(default=10, ge=1, le=50)) -> list[Asana]:
    return db.query(Asana).order_by(Asana.rank.desc()).limit(limit).all()


@router.get("/{asana_id}", response_model=AsanaOut)
def get_asana(asana_id: int, db: Annotated[Session, Depends(get_db)]) -> Asana:
    item = db.query(Asana).filter(Asana.id == asana_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Asana not found")
    return item


@router.post("", response_model=AsanaOut)
def create_asana(
    payload: AsanaBase,
    db: Annotated[Session, Depends(get_db)],
    _admin=Depends(get_current_admin),
) -> Asana:
    item = Asana(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{asana_id}", response_model=AsanaOut)
def update_asana(
    asana_id: int,
    payload: AsanaBase,
    db: Annotated[Session, Depends(get_db)],
    _admin=Depends(get_current_admin),
) -> Asana:
    item = db.query(Asana).filter(Asana.id == asana_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Asana not found")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{asana_id}")
def delete_asana(
    asana_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin=Depends(get_current_admin),
) -> dict[str, bool]:
    item = db.query(Asana).filter(Asana.id == asana_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Asana not found")
    db.delete(item)
    db.commit()
    return {"ok": True}
