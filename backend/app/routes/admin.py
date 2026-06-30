import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models import User
from app.schemas import ActivityLogOut, RankingLogOut

router = APIRouter()


class QueryPayload(BaseModel):
    sql: str


_FORBIDDEN_KEYWORDS = {"INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "EXEC", "EXECUTE"}


@router.get("/tables")
def list_tables(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> list[str]:
    result = db.execute(
        text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
    )
    return [row[0] for row in result.fetchall()]


@router.get("/table/{table_name}")
def browse_table(
    table_name: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
    page: int = 1,
    per_page: int = 50,
) -> dict:
    if not table_name.replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="Invalid table name")
    offset = (page - 1) * per_page
    count_result = db.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
    total = count_result.scalar()
    result = db.execute(
        text(f'SELECT * FROM "{table_name}" LIMIT :limit OFFSET :offset'),
        {"limit": per_page, "offset": offset},
    )
    rows = [dict(row._mapping) for row in result.fetchall()]
    columns = list(rows[0].keys()) if rows else []
    return {"rows": rows, "columns": columns, "total": total, "page": page, "per_page": per_page}


@router.post("/query")
def execute_query(
    payload: QueryPayload,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> dict:
    sql = payload.sql.strip()
    normalized = sql.upper().lstrip()
    if not normalized.startswith("SELECT"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed")
    for word in _FORBIDDEN_KEYWORDS:
        if word in normalized:
            raise HTTPException(status_code=400, detail=f"Keyword '{word}' is not allowed")
    result = db.execute(text(sql))
    if result.returns_rows:
        rows = [dict(row._mapping) for row in result.fetchall()]
        return {"rows": rows, "count": len(rows)}
    return {"rows": [], "count": 0}


@router.get("/ranking-logs", response_model=list[RankingLogOut])
def list_ranking_logs(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
    page: int = 1,
    per_page: int = 50,
) -> list:
    from app.models import RankingLog
    offset = (page - 1) * per_page
    return db.query(RankingLog).order_by(RankingLog.created_at.desc()).offset(offset).limit(per_page).all()


@router.get("/activity-logs", response_model=list[ActivityLogOut])
def list_activity_logs(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
    page: int = 1,
    per_page: int = 50,
    user_id: int | None = None,
    action: str | None = None,
    entity_type: str | None = None,
) -> list:
    from app.models import ActivityLog
    query = db.query(ActivityLog)
    if user_id is not None:
        query = query.filter(ActivityLog.user_id == user_id)
    if action is not None:
        query = query.filter(ActivityLog.action == action)
    if entity_type is not None:
        query = query.filter(ActivityLog.entity_type == entity_type)
    offset = (page - 1) * per_page
    return query.order_by(ActivityLog.created_at.desc()).offset(offset).limit(per_page).all()
