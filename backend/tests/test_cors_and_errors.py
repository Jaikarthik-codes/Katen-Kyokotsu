from sqlalchemy.exc import ProgrammingError
from sqlalchemy.exc import TimeoutError as PoolTimeoutError

from app.main import create_app
from tests.helpers import make_client


async def test_cors_allows_configured_origin(client):
    r = await client.get("/healthz", headers={"Origin": "http://localhost:5173"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"


async def test_cors_ignores_other_origin(client):
    r = await client.get("/healthz", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in r.headers


async def test_unknown_route_uses_envelope(client):
    r = await client.get("/api/v1/nope")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"


async def test_unhandled_exception_is_500_envelope(settings):
    app = create_app(settings)

    @app.get("/boom")
    async def boom():
        raise RuntimeError("secret detail")

    async with make_client(app, raise_app_exceptions=False) as c:
        r = await c.get("/boom")
    assert r.status_code == 500
    assert r.json() == {
        "error": {"code": "internal_error", "message": "Internal server error", "details": []}
    }


async def test_non_connection_db_error_is_500_not_503(settings):
    app = create_app(settings)

    @app.get("/bad-sql")
    async def bad_sql():
        raise ProgrammingError("SELECT * FROM missing", {}, Exception("relation does not exist"))

    async with make_client(app, raise_app_exceptions=False) as c:
        r = await c.get("/bad-sql")
    assert r.status_code == 500 and r.json()["error"]["code"] == "internal_error"


async def test_pool_timeout_is_503(settings):
    app = create_app(settings)

    @app.get("/pool")
    async def pool():
        raise PoolTimeoutError("QueuePool limit reached")

    async with make_client(app, raise_app_exceptions=False) as c:
        r = await c.get("/pool")
    assert r.status_code == 503 and r.json()["error"]["code"] == "db_unavailable"
