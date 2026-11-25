import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine

BACKEND = Path(__file__).resolve().parents[1]
APP_TABLES = {"projects", "skills", "experience", "contact_messages"}


async def run_alembic(url: str, cmd: str, revision: str) -> None:
    """Run an alembic command in a worker thread (alembic's async env uses asyncio.run)."""
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    await asyncio.to_thread(getattr(command, cmd), cfg, revision)


async def _inspect(url: str, fn):
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            return await conn.run_sync(lambda sync_conn: fn(inspect(sync_conn)))
    finally:
        await engine.dispose()


async def table_names(url: str) -> set[str]:
    return set(await _inspect(url, lambda insp: insp.get_table_names()))


async def index_names(url: str, table: str) -> set[str]:
    return {ix["name"] for ix in await _inspect(url, lambda insp: insp.get_indexes(table))}


async def test_upgrade_head_creates_schema_and_downgrade_removes_it(tmp_database_url):
    await run_alembic(tmp_database_url, "upgrade", "head")
    assert APP_TABLES <= await table_names(tmp_database_url)
    assert "ix_projects_stack_gin" in await index_names(tmp_database_url, "projects")
    await run_alembic(tmp_database_url, "downgrade", "base")
    assert APP_TABLES.isdisjoint(await table_names(tmp_database_url))
