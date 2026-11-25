from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.api.v1 import router as v1_router
from app.config import Settings, get_settings
from app.db import make_engine
from app.errors import install_error_handlers


def create_app(settings: Settings | None = None) -> FastAPI:
    """App factory. Run with: uvicorn app.main:create_app --factory"""
    settings = settings or get_settings()
    engine = make_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield
        await engine.dispose()

    app = FastAPI(title="Portfolio API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.engine = engine
    app.state.sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    install_error_handlers(app)
    app.include_router(v1_router)

    @app.get("/healthz")
    async def healthz() -> JSONResponse:
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        except (DBAPIError, OSError):
            return JSONResponse(status_code=503, content={"status": "degraded", "db": "down"})
        return JSONResponse(content={"status": "ok", "db": "ok"})

    return app
