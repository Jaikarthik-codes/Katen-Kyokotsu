"""Load portfolio content from seed/*.yaml into the database.

Safe to run repeatedly: rows are upserted on their natural keys
(project slug, skill name, experience kind+org+title+start).

Usage:  uv run python -m app.seed [--dir PATH]
"""

import argparse
import asyncio
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import make_engine
from app.models import Experience, Project, Skill

DEFAULT_SEED_DIR = Path(__file__).resolve().parents[2] / "seed"


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProjectSeed(_Strict):
    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=80)
    name: str = Field(min_length=1, max_length=120)
    summary: str = Field(min_length=1, max_length=300)
    body_md: str = ""
    stack: list[str] = []
    status: Literal["live", "wip", "archived"]
    repo_url: str | None = None
    live_url: str | None = None
    started_on: date | None = None
    featured: bool = False
    sort_order: int = 0


class SkillSeed(_Strict):
    name: str = Field(min_length=1, max_length=60)
    category: str = Field(min_length=1, max_length=40)
    years: Decimal | None = None
    sort_order: int = 0


class ExperienceSeed(_Strict):
    kind: Literal["education", "work", "training"]
    org: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=120)
    start: date
    end: date | None = None
    highlights: list[str] = []


@dataclass(frozen=True)
class SeedReport:
    projects: int
    skills: int
    experience: int


def _read[T: BaseModel](seed_dir: Path, filename: str, model: type[T]) -> list[T]:
    """Validate every record before anything is written. A missing file means no records."""
    path = seed_dir / filename
    if not path.exists():
        return []
    raw = yaml.safe_load(path.read_text()) or []
    try:
        return [model.model_validate(item) for item in raw]
    except ValidationError as e:
        raise ValueError(f"{filename}: {e}") from e


def _upsert(model, rows: list[BaseModel], **conflict):
    values = [r.model_dump() for r in rows]
    stmt = insert(model).values(values)
    keys = set(values[0]) - set(conflict.get("index_elements", []))
    update = {k: stmt.excluded[k] for k in keys}
    if model is Project:
        update["updated_at"] = func.now()
    return stmt.on_conflict_do_update(**conflict, set_=update)


async def load_seed(session: AsyncSession, seed_dir: Path) -> SeedReport:
    projects = _read(seed_dir, "projects.yaml", ProjectSeed)
    skills = _read(seed_dir, "skills.yaml", SkillSeed)
    experience = _read(seed_dir, "experience.yaml", ExperienceSeed)

    if projects:
        await session.execute(_upsert(Project, projects, index_elements=["slug"]))
    if skills:
        await session.execute(_upsert(Skill, skills, index_elements=["name"]))
    if experience:
        await session.execute(_upsert(Experience, experience, constraint="uq_experience_natural"))
    await session.commit()

    async def count(model) -> int:
        return (await session.execute(select(func.count()).select_from(model))).scalar_one()

    return SeedReport(
        projects=await count(Project), skills=await count(Skill), experience=await count(Experience)
    )


async def _run(seed_dir: Path) -> SeedReport:
    engine = make_engine(get_settings().database_url)
    try:
        async with AsyncSession(engine, expire_on_commit=False) as session:
            return await load_seed(session, seed_dir)
    finally:
        await engine.dispose()


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Load seed YAML into the database.")
    parser.add_argument("--dir", type=Path, default=DEFAULT_SEED_DIR)
    args = parser.parse_args(argv)
    report = asyncio.run(_run(args.dir))
    print(f"projects={report.projects} skills={report.skills} experience={report.experience}")


if __name__ == "__main__":
    main()
