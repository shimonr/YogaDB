from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models import Transition
from app.schemas import TransitionBase, TransitionOut

router = APIRouter()


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("", response_model=list[TransitionOut])
def list_transitions(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[Transition]:
    query = db.query(Transition)
    if q:
        term = f"%{_escape_like(q.strip())}%"
        query = query.filter(Transition.name.ilike(term))
    return query.order_by(Transition.rank.desc()).offset(skip).limit(limit).all()


@router.get("/top", response_model=list[TransitionOut])
def top_transitions(
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=10, ge=1, le=50),
) -> list[Transition]:
    return db.query(Transition).order_by(Transition.rank.desc()).limit(limit).all()


@router.post("", response_model=TransitionOut)
def create_transition(
    payload: TransitionBase,
    db: Annotated[Session, Depends(get_db)],
    _admin=Depends(get_current_admin),
) -> Transition:
    if payload.start_asana_id == payload.end_asana_id:
        raise HTTPException(status_code=400, detail="Start and end pose must be different")
    existing = db.query(Transition).filter(Transition.name.ilike(payload.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="A transition with this name already exists")
    item = Transition(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{transition_id}", response_model=TransitionOut)
def get_transition(transition_id: int, db: Annotated[Session, Depends(get_db)]) -> Transition:
    item = db.query(Transition).filter(Transition.id == transition_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Transition not found")
    return item


@router.put("/{transition_id}", response_model=TransitionOut)
def update_transition(
    transition_id: int,
    payload: TransitionBase,
    db: Annotated[Session, Depends(get_db)],
    _admin=Depends(get_current_admin),
) -> Transition:
    item = db.query(Transition).filter(Transition.id == transition_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Transition not found")
    if payload.start_asana_id == payload.end_asana_id:
        raise HTTPException(status_code=400, detail="Start and end pose must be different")
    duplicate = db.query(Transition).filter(Transition.name.ilike(payload.name), Transition.id != transition_id).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="A transition with this name already exists")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{transition_id}")
def delete_transition(
    transition_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin=Depends(get_current_admin),
) -> dict:
    item = db.query(Transition).filter(Transition.id == transition_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Transition not found")
    db.delete(item)
    db.commit()
    return {"ok": True}
