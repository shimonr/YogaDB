from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Asana(Base):
    __tablename__ = "asanas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    english_name: Mapped[str] = mapped_column(String(120), index=True)
    sanskrit_name: Mapped[str] = mapped_column(String(120), index=True)
    alt_name_1: Mapped[str | None] = mapped_column(String(120))
    alt_name_2: Mapped[str | None] = mapped_column(String(120))
    difficulty_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    benefits: Mapped[str] = mapped_column(Text, default="", nullable=False)
    is_classic: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    type: Mapped[str] = mapped_column(String(60), nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False)
    rank: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
