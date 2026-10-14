import time
from collections import defaultdict
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models import User
from app.schemas import PasswordChange, ProfileUpdate, Token, UserCreate, UserOut

router = APIRouter()
settings = get_settings()

# In-memory, per process. Logins count only failures, per IP *and* username, so people sharing
# an office network don't lock each other out; a successful login clears the counter.
_login_failures: dict[tuple[str, str], list[float]] = defaultdict(list)
_register_attempts: dict[str, list[float]] = defaultdict(list)
_MAX_LOGIN_FAILURES = 5
_MAX_REGISTRATIONS = 10
_WINDOW_SECONDS = 300


def _recent(store: dict, key, now: float) -> list[float]:
    store[key] = [t for t in store[key] if now - t < _WINDOW_SECONDS]
    return store[key]


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/register", response_model=UserOut)
def register(request: Request, payload: UserCreate, db: Annotated[Session, Depends(get_db)]) -> User:
    attempts = _recent(_register_attempts, _client_ip(request), time.time())
    if len(attempts) >= _MAX_REGISTRATIONS:
        raise HTTPException(status_code=429, detail="Too many registration attempts. Try again later.")
    attempts.append(time.time())
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
    key = (_client_ip(request), form_data.username.lower())
    failures = _recent(_login_failures, key, time.time())
    if len(failures) >= _MAX_LOGIN_FAILURES:
        raise HTTPException(status_code=429, detail="Too many failed login attempts. Try again in a few minutes.")
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        failures.append(time.time())
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    _login_failures.pop(key, None)
    token = create_access_token(
        subject=user.username,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return Token(access_token=token, user=user)


@router.get("/me", response_model=UserOut)
def read_me(user: Annotated[User, Depends(get_current_user)]) -> User:
    return user


@router.put("/me", response_model=UserOut)
def update_me(
    payload: ProfileUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    taken = db.query(User).filter(User.email == payload.email, User.id != user.id).first()
    if taken:
        raise HTTPException(status_code=400, detail="Email already in use")
    user.email = payload.email
    db.commit()
    db.refresh(user)
    return user


@router.post("/me/password", status_code=204)
def change_password(
    payload: PasswordChange,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = get_password_hash(payload.new_password)
    db.commit()
