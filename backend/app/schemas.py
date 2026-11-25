from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict


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
