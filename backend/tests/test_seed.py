from pathlib import Path

import pytest
import yaml
from sqlalchemy import select

from app.models import Project
from app.seed import SeedReport, load_seed
from tests.helpers import FIXTURE_DIR


def copy_fixture(dest: Path, edit: dict[str, tuple[str, str]]) -> None:
    for src in FIXTURE_DIR.glob("*.yaml"):
        text = src.read_text()
        if src.name in edit:
            old, new = edit[src.name]
            assert old in text
            text = text.replace(old, new)
        (dest / src.name).write_text(text)


def write_yaml(dest: Path, name: str, records: list[dict]) -> None:
    (dest / name).write_text(yaml.safe_dump(records))


async def get_project(session, slug: str) -> Project:
    stmt = select(Project).where(Project.slug == slug).execution_options(populate_existing=True)
    return (await session.execute(stmt)).scalar_one()


async def test_seed_loads_fixture(db_session):
    report = await load_seed(db_session, FIXTURE_DIR)
    assert report == SeedReport(projects=3, skills=4, experience=2)


async def test_seed_is_idempotent_and_updates(db_session, tmp_path):
    await load_seed(db_session, FIXTURE_DIR)
    copy_fixture(tmp_path, edit={"projects.yaml": ("summary: Old", "summary: New")})
    report = await load_seed(db_session, tmp_path)
    assert report == SeedReport(projects=3, skills=4, experience=2)
    assert (await get_project(db_session, "alpha")).summary == "New"


async def test_seed_rejects_bad_status(db_session, tmp_path):
    write_yaml(
        tmp_path, "projects.yaml", [{"slug": "x", "name": "X", "summary": "s", "status": "done"}]
    )
    with pytest.raises(ValueError, match="status"):
        await load_seed(db_session, tmp_path)
