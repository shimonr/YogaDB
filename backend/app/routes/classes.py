import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models import Class, Flow, User
from app.schemas import ClassCreate, ClassOut

router = APIRouter()


def _require_flows(db: Session, flow_ids: list[int]) -> None:
    found = {row[0] for row in db.query(Flow.id).filter(Flow.id.in_(flow_ids))}
    missing = sorted(set(flow_ids) - found)
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown flow ids: {missing}")


@router.get("", response_model=list[ClassOut])
def list_classes(
    db: Annotated[Session, Depends(get_db)],
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
) -> list[Class]:
    return db.query(Class).order_by(Class.rank.desc(), Class.id).offset(skip).limit(limit).all()


@router.get("/top", response_model=list[ClassOut])
def top_classes(db: Annotated[Session, Depends(get_db)]) -> list[Class]:
    return db.query(Class).order_by(Class.rank.desc()).limit(10).all()


@router.get("/{class_id}", response_model=ClassOut)
def get_class(class_id: int, db: Annotated[Session, Depends(get_db)]) -> Class:
    item = db.query(Class).filter(Class.id == class_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Class not found")
    return item


@router.post("", response_model=ClassOut, status_code=201)
def create_class(
    payload: ClassCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> Class:
    _require_flows(db, payload.flow_ids)
    item = Class(
        name=payload.name,
        description=payload.description,
        flow_ids=json.dumps(payload.flow_ids),
        difficulty_level=payload.difficulty_level,
        rank=payload.rank,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{class_id}", response_model=ClassOut)
def update_class(
    class_id: int,
    payload: ClassCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> Class:
    item = db.query(Class).filter(Class.id == class_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Class not found")
    _require_flows(db, payload.flow_ids)
    item.name = payload.name
    item.description = payload.description
    item.flow_ids = json.dumps(payload.flow_ids)
    item.difficulty_level = payload.difficulty_level
    item.rank = payload.rank
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{class_id}")
def delete_class(
    class_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> dict:
    item = db.query(Class).filter(Class.id == class_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Class not found")
    db.delete(item)
    db.commit()
    return {"ok": True}
