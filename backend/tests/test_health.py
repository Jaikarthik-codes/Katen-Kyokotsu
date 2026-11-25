from app.main import create_app
from tests.helpers import make_client

BAD_DB = "postgresql+psycopg://x:x@127.0.0.1:1/none"


async def test_healthz_ok(client):
    r = await client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "db": "ok"}


async def test_healthz_db_down_returns_503_envelope(settings):
    bad = settings.model_copy(update={"database_url": BAD_DB})
    async with make_client(create_app(bad)) as c:
        r = await c.get("/healthz")
    assert r.status_code == 503
    assert r.json() == {"status": "degraded", "db": "down"}
