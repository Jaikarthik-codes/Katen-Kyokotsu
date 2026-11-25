# Fixture skills: Python (Languages, 1), SQL (Languages, 2), FastAPI (Frameworks, 1),
# PostgreSQL (Databases, 1) -> ordered by category, then sort_order, then name.
EXPECTED_SKILL_ORDER = ["PostgreSQL", "FastAPI", "Python", "SQL"]


async def test_skills_order(client, seeded):
    names = [s["name"] for s in (await client.get("/api/v1/skills")).json()]
    assert names == EXPECTED_SKILL_ORDER


async def test_experience_newest_first(client, seeded):
    rows = (await client.get("/api/v1/experience")).json()
    assert rows[0]["start"] > rows[1]["start"] and isinstance(rows[0]["highlights"], list)


async def test_meta_empty_database(client):
    assert (await client.get("/api/v1/skills")).json() == []
    assert (await client.get("/api/v1/experience")).json() == []
