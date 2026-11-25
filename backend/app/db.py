from collections.abc import AsyncIterator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine


def make_engine(url: str) -> AsyncEngine:
    # pre_ping drops dead pooled connections (e.g. after a database restart);
    # connect_timeout stops requests hanging when the database host is unreachable.
    return create_async_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 5})


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: one session per request, closed afterwards."""
    async with request.app.state.sessionmaker() as session:
        yield session
