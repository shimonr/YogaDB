import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import PasswordResetToken, User


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_reset_link(db: Session, user: User, valid_for: timedelta) -> str:
    """Store a new one-time token for `user` and return the reset link containing it."""
    token = secrets.token_urlsafe(32)
    db.add(PasswordResetToken(user_id=user.id, token_hash=_hash(token), expires_at=datetime.now(UTC) + valid_for))
    db.commit()
    return f"{get_settings().public_url.rstrip('/')}/reset-password?token={token}"


def consume_reset_token(db: Session, token: str) -> User | None:
    """Return the user for a valid, unused, unexpired token and invalidate all their tokens."""
    item = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == _hash(token)).first()
    if item is None or item.used_at is not None:
        return None
    expires_at = item.expires_at if item.expires_at.tzinfo else item.expires_at.replace(tzinfo=UTC)  # SQLite
    if expires_at < datetime.now(UTC):
        return None
    now = datetime.now(UTC)
    for other in db.query(PasswordResetToken).filter(PasswordResetToken.user_id == item.user_id,
                                                     PasswordResetToken.used_at.is_(None)):
        other.used_at = now
    return db.get(User, item.user_id)
