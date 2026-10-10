from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models import ActivityLog, RankingLog, User
from app.schemas import ActivityLogOut, RankingLogOut

router = APIRouter()

_MAX_QUERY_ROWS = 1000


class QueryPayload(BaseModel):
    sql: str


def _table_names(db: Session) -> list[str]:
    return sorted(inspect(db.get_bind()).get_table_names())


@router.get("/tables")
def list_tables(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> list[str]:
    return _table_names(db)


@router.get("/table/{table_name}")
def browse_table(
    table_name: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
) -> dict:
    if table_name not in _table_names(db):
        raise HTTPException(status_code=404, detail="Table not found")
    offset = (page - 1) * per_page
    total = db.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar()
    result = db.execute(
        text(f'SELECT * FROM "{table_name}" LIMIT :limit OFFSET :offset'),
        {"limit": per_page, "offset": offset},
    )
    columns = list(result.keys())
    rows = [dict(row._mapping) for row in result.fetchall()]
    return {"rows": rows, "columns": columns, "total": total, "page": page, "per_page": per_page}


@router.post("/query")
def execute_query(
    payload: QueryPayload,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> dict:
    sql = payload.sql.strip().rstrip(";").strip()
    first_word = sql.split(None, 1)[0].upper() if sql else ""
    if first_word not in {"SELECT", "WITH"}:
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed")
    if ";" in sql:
        raise HTTPException(status_code=400, detail="Only one statement is allowed")

    # The database itself enforces read-only access; keyword filtering cannot.
    connection = db.connection()
    dialect = connection.dialect.name
    if dialect not in {"postgresql", "sqlite"}:
        raise HTTPException(status_code=400, detail=f"SQL console is not supported on {dialect}")
    raw = connection.connection.dbapi_connection
    try:
        if dialect == "postgresql":
            connection.execute(text("SET TRANSACTION READ ONLY"))
            connection.execute(text("SET LOCAL statement_timeout = '5s'"))
        else:
            raw.execute("PRAGMA query_only = ON")
        result = connection.execute(text(sql))
        rows = [dict(row._mapping) for row in result.fetchmany(_MAX_QUERY_ROWS)] if result.returns_rows else []
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=400, detail=str(getattr(exc, "orig", None) or exc)) from exc
    finally:
        if dialect == "sqlite":
            raw.execute("PRAGMA query_only = OFF")
        db.rollback()
    return {"rows": rows, "count": len(rows)}


@router.get("/ranking-logs", response_model=list[RankingLogOut])
def list_ranking_logs(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
) -> list:
    offset = (page - 1) * per_page
    return db.query(RankingLog).order_by(RankingLog.created_at.desc()).offset(offset).limit(per_page).all()


@router.get("/activity-logs", response_model=list[ActivityLogOut])
def list_activity_logs(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    user_id: int | None = None,
    action: str | None = None,
    entity_type: str | None = None,
) -> list:
    query = db.query(ActivityLog)
    if user_id is not None:
        query = query.filter(ActivityLog.user_id == user_id)
    if action is not None:
        query = query.filter(ActivityLog.action == action)
    if entity_type is not None:
        query = query.filter(ActivityLog.entity_type == entity_type)
    offset = (page - 1) * per_page
    return query.order_by(ActivityLog.created_at.desc()).offset(offset).limit(per_page).all()
