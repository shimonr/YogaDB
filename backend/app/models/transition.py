from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Transition(Base):
    __tablename__ = "transitions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    start_asana_id: Mapped[int] = mapped_column(ForeignKey("asanas.id", ondelete="CASCADE"), nullable=False)
    end_asana_id: Mapped[int] = mapped_column(ForeignKey("asanas.id", ondelete="CASCADE"), nullable=False)
    difficulty_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    rank: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
