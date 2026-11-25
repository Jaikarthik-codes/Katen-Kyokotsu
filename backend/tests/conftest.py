from collections.abc import AsyncIterator

import httpx
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.config import Settings
from app.db import make_engine
from app.main import create_app
from app.models import Base
from tests.helpers import TEST_DATABASE_URL, make_client


@pytest.fixture(scope="session")
def settings() -> Settings:
    return Settings(
        database_url=TEST_DATABASE_URL,
        ip_hash_salt="test-salt",
        cors_origins=["http://localhost:5173"],
    )


@pytest.fixture(scope="session")
async def engine(settings: Settings) -> AsyncIterator[AsyncEngine]:
    eng = make_engine(settings.database_url)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest.fixture(autouse=True)
async def _clean_tables(engine: AsyncEngine) -> AsyncIterator[None]:
    tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
    if tables:
        async with engine.begin() as conn:
            await conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture
async def db_session(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


@pytest.fixture
async def client(settings: Settings) -> AsyncIterator[httpx.AsyncClient]:
    async with make_client(create_app(settings)) as c:
        yield c
