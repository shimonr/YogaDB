import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import LIKE_ESCAPE, contains_pattern, get_db
from app.core.deps import get_current_admin
from app.models import Flow, Transition
from app.schemas import FlowCreate, FlowOut

router = APIRouter()


def _require_transitions(db: Session, transition_ids: list[int]) -> None:
    found = {row[0] for row in db.query(Transition.id).filter(Transition.id.in_(transition_ids))}
    missing = sorted(set(transition_ids) - found)
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown transition ids: {missing}")


def _row_to_out(row: Flow) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "transition_ids": json.loads(row.transition_ids) if row.transition_ids else [],
        "difficulty_level": row.difficulty_level,
        "rank": row.rank,
    }


@router.get("", response_model=list[FlowOut])
def list_flows(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[dict]:
    query = db.query(Flow)
    if q:
        query = query.filter(Flow.name.ilike(contains_pattern(q), escape=LIKE_ESCAPE))
    rows = query.order_by(Flow.rank.desc(), Flow.id).offset(skip).limit(limit).all()
    return [_row_to_out(r) for r in rows]


@router.get("/top", response_model=list[FlowOut])
def top_flows(
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=10, ge=1, le=50),
) -> list[dict]:
    rows = db.query(Flow).order_by(Flow.rank.desc()).limit(limit).all()
    return [_row_to_out(r) for r in rows]


@router.post("", response_model=FlowOut)
def create_flow(payload: FlowCreate, db: Annotated[Session, Depends(get_db)], _admin=Depends(get_current_admin)) -> dict:
    _require_transitions(db, payload.transition_ids)
    item = Flow(
        name=payload.name,
        transition_ids=json.dumps(payload.transition_ids),
        difficulty_level=payload.difficulty_level,
        rank=payload.rank,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _row_to_out(item)


@router.get("/{flow_id}", response_model=FlowOut)
def get_flow(flow_id: int, db: Annotated[Session, Depends(get_db)]) -> dict:
    item = db.query(Flow).filter(Flow.id == flow_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Flow not found")
    return _row_to_out(item)


@router.put("/{flow_id}", response_model=FlowOut)
def update_flow(
    flow_id: int,
    payload: FlowCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin=Depends(get_current_admin),
) -> dict:
    item = db.query(Flow).filter(Flow.id == flow_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Flow not found")
    _require_transitions(db, payload.transition_ids)
    item.name = payload.name
    item.transition_ids = json.dumps(payload.transition_ids)
    item.difficulty_level = payload.difficulty_level
    item.rank = payload.rank
    db.add(item)
    db.commit()
    db.refresh(item)
    return _row_to_out(item)


@router.delete("/{flow_id}")
def delete_flow(flow_id: int, db: Annotated[Session, Depends(get_db)], _admin=Depends(get_current_admin)) -> dict:
    item = db.query(Flow).filter(Flow.id == flow_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Flow not found")
    db.delete(item)
    db.commit()
    return {"ok": True}
