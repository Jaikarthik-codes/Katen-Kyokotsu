from time import perf_counter
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.errors import ApiError
from app.models import Project
from app.schemas import ProjectDetail, ProjectList, ProjectOut, TagOut

router = APIRouter(tags=["projects"])

MAX_TAGS = 5
Session = Annotated[AsyncSession, Depends(get_session)]


def _unique_tags(raw: list[str]) -> list[str]:
    """Trim, drop empties, and de-duplicate case-insensitively (first spelling wins)."""
    seen: set[str] = set()
    out: list[str] = []
    for t in (t.strip() for t in raw):
        if t and t.lower() not in seen:
            seen.add(t.lower())
            out.append(t)
    return out


async def _known_tags(session: AsyncSession) -> dict[str, str]:
    """Map lower-case tag -> stored label, from every project's stack."""
    rows = await session.execute(select(func.unnest(Project.stack)).distinct())
    return {label.lower(): label for (label,) in rows}


@router.get("/projects", response_model=ProjectList)
async def list_projects(
    session: Session, tag: Annotated[list[str] | None, Query()] = None
) -> ProjectList:
    tags = _unique_tags(tag or [])
    if len(tags) > MAX_TAGS:
        raise ApiError(422, "validation_error", "Too many tags", [{"max": MAX_TAGS}])

    labels: list[str] = []
    if tags:
        known = await _known_tags(session)
        for t in tags:
            if t.lower() not in known:
                raise ApiError(422, "unknown_tag", "Unknown tag", [{"tag": t}])
            labels.append(known[t.lower()])

    stmt = select(Project).order_by(
        Project.featured.desc(), Project.sort_order.asc(), Project.started_on.desc().nulls_last()
    )
    if labels:
        stmt = stmt.where(Project.stack.contains(labels))

    started = perf_counter()
    projects = (await session.execute(stmt)).scalars().all()
    elapsed_ms = round((perf_counter() - started) * 1000, 1)

    rows = [ProjectOut.model_validate(p) for p in projects]
    return ProjectList(rows=rows, count=len(rows), elapsed_ms=elapsed_ms)


@router.get("/projects/{slug}", response_model=ProjectDetail)
async def get_project(slug: str, session: Session) -> ProjectDetail:
    if "\x00" in slug:  # cannot exist in PostgreSQL text; don't send it to the database
        raise ApiError(404, "not_found", "Project not found", [{"slug": slug}])
    project = (
        await session.execute(select(Project).where(Project.slug == slug))
    ).scalar_one_or_none()
    if project is None:
        raise ApiError(404, "not_found", "Project not found", [{"slug": slug}])
    return ProjectDetail.model_validate(project)


@router.get("/tags", response_model=list[TagOut])
async def list_tags(session: Session) -> list[TagOut]:
    tags = select(func.unnest(Project.stack).label("label")).subquery()
    count = func.count().label("count")
    stmt = select(tags.c.label, count).group_by(tags.c.label).order_by(count.desc(), tags.c.label)
    return [TagOut(label=label, count=n) for label, n in await session.execute(stmt)]
