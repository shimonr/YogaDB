from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Flow(Base):
    __tablename__ = "flows"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    transition_1_id: Mapped[int] = mapped_column(ForeignKey("transitions.id", ondelete="CASCADE"), nullable=False)
    transition_2_id: Mapped[int] = mapped_column(ForeignKey("transitions.id", ondelete="CASCADE"), nullable=False)
    transition_3_id: Mapped[int] = mapped_column(ForeignKey("transitions.id", ondelete="CASCADE"), nullable=False)
    transition_4_id: Mapped[int] = mapped_column(ForeignKey("transitions.id", ondelete="CASCADE"), nullable=False)
    difficulty_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    rank: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
