from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Photo(Base):
    __tablename__ = "photos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    asana_id: Mapped[int] = mapped_column(ForeignKey("asanas.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    local_path: Mapped[str] = mapped_column(String(255), nullable=False)
    original_url: Mapped[str | None] = mapped_column(String(500))
    rank: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
