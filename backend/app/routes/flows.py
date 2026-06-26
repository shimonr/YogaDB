from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models import Flow
from app.schemas import FlowBase, FlowOut

router = APIRouter()


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("", response_model=list[FlowOut])
def list_flows(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[Flow]:
    query = db.query(Flow)
    if q:
        term = f"%{_escape_like(q.strip())}%"
        query = query.filter(Flow.name.ilike(term))
    return query.order_by(Flow.rank.desc()).offset(skip).limit(limit).all()


@router.get("/top", response_model=list[FlowOut])
def top_flows(
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=10, ge=1, le=50),
) -> list[Flow]:
    return db.query(Flow).order_by(Flow.rank.desc()).limit(limit).all()


@router.post("", response_model=FlowOut)
def create_flow(payload: FlowBase, db: Annotated[Session, Depends(get_db)], _admin=Depends(get_current_admin)) -> Flow:
    item = Flow(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{flow_id}", response_model=FlowOut)
def get_flow(flow_id: int, db: Annotated[Session, Depends(get_db)]) -> Flow:
    item = db.query(Flow).filter(Flow.id == flow_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Flow not found")
    return item


@router.put("/{flow_id}", response_model=FlowOut)
def update_flow(
    flow_id: int,
    payload: FlowBase,
    db: Annotated[Session, Depends(get_db)],
    _admin=Depends(get_current_admin),
) -> Flow:
    item = db.query(Flow).filter(Flow.id == flow_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Flow not found")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{flow_id}")
def delete_flow(flow_id: int, db: Annotated[Session, Depends(get_db)], _admin=Depends(get_current_admin)) -> dict:
    item = db.query(Flow).filter(Flow.id == flow_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Flow not found")
    db.delete(item)
    db.commit()
    return {"ok": True}
