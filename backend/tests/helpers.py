"""Shared test helpers (importable from test modules, unlike conftest)."""

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://portfolio:portfolio@localhost:5432/portfolio_test",
)


@asynccontextmanager
async def make_client(
    app: FastAPI, raise_app_exceptions: bool = True
) -> AsyncIterator[httpx.AsyncClient]:
    """An HTTP client wired straight into the ASGI app, no network involved."""
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=raise_app_exceptions)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield client
    finally:
        engine = getattr(app.state, "engine", None)
        if engine is not None:
            await engine.dispose()
