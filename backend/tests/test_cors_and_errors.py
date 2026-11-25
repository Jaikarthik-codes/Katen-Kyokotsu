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
