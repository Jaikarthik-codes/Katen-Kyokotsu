from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.api.v1.contact import hash_ip
from app.main import create_app
from app.models import ContactMessage
from tests.helpers import make_client

VALID = {"name": "Asha", "email": "asha@example.com", "message": "Hello, I would like to talk."}
BAD_DB = "postgresql+psycopg://x:x@127.0.0.1:1/none"


async def only_contact_row(session) -> ContactMessage:
    stmt = select(ContactMessage).execution_options(populate_existing=True)
    rows = (await session.execute(stmt)).scalars().all()
    assert len(rows) == 1
    return rows[0]


async def contact_count(session) -> int:
    return (await session.execute(select(func.count()).select_from(ContactMessage))).scalar_one()


async def insert_contacts(session, n: int, ip_hash: str, age_minutes: int) -> None:
    created = datetime.now(UTC) - timedelta(minutes=age_minutes)
    session.add_all(
        ContactMessage(
            name="Old",
            email="old@example.com",
            message="An older message.",
            ip_hash=ip_hash,
            created_at=created,
        )
        for _ in range(n)
    )
    await session.commit()


async def test_valid_message_is_stored_with_hashed_ip(client, db_session):
    r = await client.post("/api/v1/contact", json=VALID)
    assert r.status_code == 202 and r.json() == {"status": "received"}
    row = await only_contact_row(db_session)
    assert row.ip_hash == hash_ip("127.0.0.1", "test-salt") and "127.0.0.1" not in row.ip_hash


async def test_honeypot_returns_202_but_stores_nothing(client, db_session):
    r = await client.post("/api/v1/contact", json={**VALID, "website": "http://spam"})
    assert r.status_code == 202 and await contact_count(db_session) == 0


async def test_sixth_message_in_an_hour_is_429(client):
    for _ in range(5):
        assert (await client.post("/api/v1/contact", json=VALID)).status_code == 202
    r = await client.post("/api/v1/contact", json=VALID)
    assert r.status_code == 429 and r.json()["error"]["code"] == "rate_limited"


async def test_old_messages_do_not_count(client, db_session):
    await insert_contacts(
        db_session, n=5, ip_hash=hash_ip("127.0.0.1", "test-salt"), age_minutes=61
    )
    assert (await client.post("/api/v1/contact", json=VALID)).status_code == 202


@pytest.mark.parametrize(
    "field,value",
    [("email", "not-an-email"), ("message", "short"), ("message", "x" * 2001), ("name", "   ")],
)
async def test_invalid_input_is_422(client, field, value):
    r = await client.post("/api/v1/contact", json={**VALID, field: value})
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


async def test_unicode_and_html_stored_verbatim(client, db_session):
    msg = "Namaste 🙏 <script>alert(1)</script> — let's talk"
    await client.post("/api/v1/contact", json={**VALID, "message": msg})
    assert (await only_contact_row(db_session)).message == msg


async def test_forwarded_for_ignored_unless_trusted(settings, db_session):
    # The proxy appends the real client IP on the right; the left part is whatever the client sent.
    headers = {"X-Forwarded-For": "198.51.100.7, 203.0.113.9"}
    for trust, expected_ip in [(False, "127.0.0.1"), (True, "203.0.113.9")]:
        app = create_app(settings.model_copy(update={"trust_proxy_headers": trust}))
        async with make_client(app) as c:
            r = await c.post("/api/v1/contact", json=VALID, headers=headers)
        assert r.status_code == 202
        newest = select(ContactMessage).order_by(ContactMessage.id.desc()).limit(1)
        row = (await db_session.execute(newest)).scalar_one()
        assert row.ip_hash == hash_ip(expected_ip, "test-salt")


async def test_rotating_spoofed_forwarded_for_cannot_bypass_limit(settings):
    app = create_app(settings.model_copy(update={"trust_proxy_headers": True}))
    async with make_client(app) as c:
        codes = [
            (
                await c.post(
                    "/api/v1/contact",
                    json=VALID,
                    headers={"X-Forwarded-For": f"198.51.100.{i}, 203.0.113.9"},
                )
            ).status_code
            for i in range(6)
        ]
    assert codes == [202] * 5 + [429]


async def test_nul_byte_in_contact_is_422(client, db_session):
    r = await client.post("/api/v1/contact", json={**VALID, "message": "Hello\x00 there, friend"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"
    assert await contact_count(db_session) == 0


async def test_contact_db_down_is_503(settings):
    bad = settings.model_copy(update={"database_url": BAD_DB})
    async with make_client(create_app(bad)) as c:
        r = await c.post("/api/v1/contact", json=VALID)
    assert r.status_code == 503 and r.json()["error"]["code"] == "db_unavailable"
