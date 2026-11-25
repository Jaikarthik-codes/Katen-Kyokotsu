from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class _FromOrm(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ProjectOut(_FromOrm):
    slug: str
    name: str
    summary: str
    stack: list[str]
    status: Literal["live", "wip", "archived"]
    repo_url: str | None
    live_url: str | None
    started_on: date | None
    featured: bool


class ProjectDetail(ProjectOut):
    body_md: str


class ProjectList(BaseModel):
    rows: list[ProjectOut]
    count: int
    elapsed_ms: float


class TagOut(BaseModel):
    label: str
    count: int


class SkillOut(_FromOrm):
    name: str
    category: str
    years: float | None


class ExperienceOut(_FromOrm):
    kind: Literal["education", "work", "training"]
    org: str
    title: str
    start: date
    end: date | None
    highlights: list[str]


class ContactIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    message: str = Field(min_length=10, max_length=2000)
    # Honeypot: hidden in the real form, so only bots fill it in.
    website: str = Field(default="", max_length=300)

    @field_validator("name", "message")
    @classmethod
    def no_nul_bytes(cls, v: str) -> str:
        # PostgreSQL text cannot store NUL; reject it here as bad input, not a database error.
        if "\x00" in v:
            raise ValueError("must not contain NUL characters")
        return v


class ContactAccepted(BaseModel):
    status: Literal["received"]
