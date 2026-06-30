from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Flow(Base):
    __tablename__ = "flows"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    transition_ids: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    difficulty_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    rank: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
