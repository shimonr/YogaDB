import time
from collections import defaultdict
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models import User
from app.schemas import Token, UserCreate, UserOut

router = APIRouter()
settings = get_settings()

_login_attempts: dict[str, list[float]] = defaultdict(list)
_register_attempts: dict[str, list[float]] = defaultdict(list)
_MAX_ATTEMPTS = 5
_WINDOW_SECONDS = 300


def _check_rate_limit(ip: str, store: dict[str, list[float]] | None = None, label: str = "requests") -> None:
    store = store if store is not None else _login_attempts
    now = time.time()
    store[ip] = [t for t in store[ip] if now - t < _WINDOW_SECONDS]
    if len(store[ip]) >= _MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail=f"Too many {label}. Try again later.")
    store[ip].append(now)


@router.post("/register", response_model=UserOut)
def register(request: Request, payload: UserCreate, db: Annotated[Session, Depends(get_db)]) -> User:
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip, _register_attempts, "registration attempts")
    exists = db.query(User).filter((User.username == payload.username) | (User.email == payload.email)).first()
    if exists:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
) -> Token:
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    token = create_access_token(
        subject=user.username,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return Token(access_token=token, user=user)
