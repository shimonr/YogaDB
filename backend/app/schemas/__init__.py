from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)


class UserOut(ORMBase):
    id: int
    username: str
    email: EmailStr
    role: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class AsanaBase(BaseModel):
    english_name: str = Field(min_length=1, max_length=120)
    sanskrit_name: str = Field(min_length=1, max_length=120)
    alt_name_1: str | None = None
    alt_name_2: str | None = None
    difficulty_level: int = Field(ge=1, le=5)
    benefits: str
    is_classic: bool
    type: str = Field(min_length=1, max_length=60)
    category: str = Field(min_length=1, max_length=60)
    rank: int = Field(default=50, ge=1, le=100)


class AsanaOut(AsanaBase, ORMBase):
    id: int


class PhotoCreate(BaseModel):
    type: str = Field(pattern=r"^(upload|download)$")
    asana_id: int
    original_url: str | None = None
    rank: int = Field(default=50, ge=1, le=100)


class PhotoOut(ORMBase):
    id: int
    type: str
    asana_id: int
    user_id: int | None = None
    local_path: str
    original_url: str | None = None
    rank: int


class TransitionBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    start_asana_id: int
    end_asana_id: int
    difficulty_level: int = Field(ge=1, le=5)
    rank: int = Field(default=50, ge=1, le=100)


class TransitionOut(TransitionBase, ORMBase):
    id: int


class FlowBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    transition_1_id: int
    transition_2_id: int
    transition_3_id: int
    transition_4_id: int
    difficulty_level: int = Field(ge=1, le=5)
    rank: int = Field(default=50, ge=1, le=100)


class FlowOut(FlowBase, ORMBase):
    id: int


class RankingCreate(BaseModel):
    type: Literal["asana", "photo", "transition", "flow"]
    target_id: int
    rank: int = Field(ge=1, le=100)
