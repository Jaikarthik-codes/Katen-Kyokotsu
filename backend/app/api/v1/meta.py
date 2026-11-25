from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Experience, Skill
from app.schemas import ExperienceOut, SkillOut

router = APIRouter(tags=["profile"])
Session = Annotated[AsyncSession, Depends(get_session)]


@router.get("/skills", response_model=list[SkillOut])
async def list_skills(session: Session) -> list[SkillOut]:
    stmt = select(Skill).order_by(Skill.category, Skill.sort_order, Skill.name)
    return [SkillOut.model_validate(s) for s in (await session.execute(stmt)).scalars()]


@router.get("/experience", response_model=list[ExperienceOut])
async def list_experience(session: Session) -> list[ExperienceOut]:
    stmt = select(Experience).order_by(Experience.start.desc())
    return [ExperienceOut.model_validate(e) for e in (await session.execute(stmt)).scalars()]
