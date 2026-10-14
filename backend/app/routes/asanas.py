from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.database import LIKE_ESCAPE, contains_pattern, get_db
from app.core.deps import get_current_admin
from app.models import Asana, Photo, Transition
from app.schemas import AsanaBase, AsanaOut
from app.services.activity_service import client_ip, log_activity
from app.services.photo_storage import remove_photo_file
from app.services.ranking_service import delete_rankings

router = APIRouter()


def _cover_photo_ids(db: Session, asana_ids: list[int]) -> dict[int, int]:
    if not asana_ids:
        return {}
    subq = (
        db.query(
            Photo.id.label("photo_id"),
            Photo.asana_id,
            func.rank().over(partition_by=Photo.asana_id, order_by=Photo.rank.desc()).label("rn"),
        )
        .filter(Photo.asana_id.in_(asana_ids))
        .subquery()
    )
    rows = db.query(subq.c.asana_id, subq.c.photo_id).filter(subq.c.rn == 1).all()
    return {asana_id: photo_id for asana_id, photo_id in rows}


def _enrich(asanas: list[Asana], db: Session) -> list[AsanaOut]:
    ids = [a.id for a in asanas]
    cover_map = _cover_photo_ids(db, ids)
    return [
        AsanaOut.model_validate(a, from_attributes=True).model_copy(
            update={"cover_photo_id": cover_map.get(a.id)}
        )
        for a in asanas
    ]


@router.get("", response_model=list[AsanaOut])
def get_asanas(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = Query(default=None),
    type: str | None = Query(default=None),
    category: str | None = Query(default=None),
    difficulty_level: int | None = Query(default=None, ge=1, le=5),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[AsanaOut]:
    query = db.query(Asana)
    if q:
        term = contains_pattern(q)
        query = query.filter(
            or_(
                *(
                    column.ilike(term, escape=LIKE_ESCAPE)
                    for column in (
                        Asana.english_name,
                        Asana.sanskrit_name,
                        Asana.alt_name_1,
                        Asana.alt_name_2,
                        Asana.benefits,
                    )
                )
            )
        )
    if type:
        query = query.filter(Asana.type == type)
    if category:
        query = query.filter(Asana.category == category)
    if difficulty_level:
        query = query.filter(Asana.difficulty_level == difficulty_level)
    asanas = query.order_by(Asana.rank.desc(), Asana.id).offset(skip).limit(limit).all()
    return _enrich(asanas, db)


@router.get("/top", response_model=list[AsanaOut])
def top_asanas(db: Annotated[Session, Depends(get_db)], limit: int = Query(default=10, ge=1, le=50)) -> list[AsanaOut]:
    asanas = db.query(Asana).order_by(Asana.rank.desc()).limit(limit).all()
    return _enrich(asanas, db)


@router.get("/{asana_id}", response_model=AsanaOut)
def get_asana(asana_id: int, db: Annotated[Session, Depends(get_db)]) -> AsanaOut:
    item = db.query(Asana).filter(Asana.id == asana_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Asana not found")
    return _enrich([item], db)[0]


@router.post("", response_model=AsanaOut)
def create_asana(
    request: Request,
    payload: AsanaBase,
    db: Annotated[Session, Depends(get_db)],
    admin=Depends(get_current_admin),
) -> Asana:
    item = Asana(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    log_activity(db, admin.id, "create", "asana", item.id, {"name": item.english_name}, client_ip(request))
    return item


@router.put("/{asana_id}", response_model=AsanaOut)
def update_asana(
    request: Request,
    asana_id: int,
    payload: AsanaBase,
    db: Annotated[Session, Depends(get_db)],
    admin=Depends(get_current_admin),
) -> Asana:
    item = db.query(Asana).filter(Asana.id == asana_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Asana not found")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.add(item)
    db.commit()
    db.refresh(item)
    log_activity(db, admin.id, "update", "asana", item.id, {"name": item.english_name}, client_ip(request))
    return item


@router.delete("/{asana_id}")
def delete_asana(
    request: Request,
    asana_id: int,
    db: Annotated[Session, Depends(get_db)],
    admin=Depends(get_current_admin),
) -> dict[str, bool]:
    item = db.query(Asana).filter(Asana.id == asana_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Asana not found")
    name = item.english_name
    # Photos and transitions go with the asana (ON DELETE CASCADE); their files and ratings don't.
    photos = db.query(Photo.id, Photo.local_path).filter(Photo.asana_id == asana_id).all()
    transition_ids = [t.id for t in db.query(Transition.id).filter((Transition.start_asana_id == asana_id) | (Transition.end_asana_id == asana_id))]
    for photo in photos:
        remove_photo_file(photo.local_path)
    delete_rankings(db, "asana", [asana_id])
    delete_rankings(db, "photo", [p.id for p in photos])
    delete_rankings(db, "transition", transition_ids)
    db.delete(item)
    db.commit()
    log_activity(db, admin.id, "delete", "asana", asana_id, {"name": name}, client_ip(request))
    return {"ok": True}
