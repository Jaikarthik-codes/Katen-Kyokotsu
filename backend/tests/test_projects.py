async def test_list_orders_featured_first(client, seeded):
    r = await client.get("/api/v1/projects")
    body = r.json()
    assert [p["slug"] for p in body["rows"]] == ["alpha", "beta", "gamma"]
    assert body["count"] == 3 and body["elapsed_ms"] >= 0
    assert "body_md" not in body["rows"][0]


async def test_filter_is_and(client, seeded):
    r = await client.get("/api/v1/projects", params=[("tag", "FastAPI"), ("tag", "React")])
    assert [p["slug"] for p in r.json()["rows"]] == ["beta"]


async def test_tag_case_whitespace_and_duplicates(client, seeded):
    r = await client.get("/api/v1/projects", params=[("tag", " fastapi "), ("tag", "FASTAPI")])
    assert r.status_code == 200 and r.json()["count"] == 2


async def test_unknown_tag_is_422_envelope(client, seeded):
    r = await client.get("/api/v1/projects", params={"tag": "cobol"})
    assert r.status_code == 422
    assert r.json()["error"] == {
        "code": "unknown_tag",
        "message": "Unknown tag",
        "details": [{"tag": "cobol"}],
    }


async def test_more_than_five_tags_is_422(client, seeded):
    r = await client.get("/api/v1/projects", params=[("tag", f"t{i}") for i in range(6)])
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


async def test_detail_and_404(client, seeded):
    assert (await client.get("/api/v1/projects/alpha")).json()["body_md"] == ""
    r = await client.get("/api/v1/projects/nope")
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"


async def test_tags_counts(client, seeded):
    r = await client.get("/api/v1/tags")
    assert r.json()[0] == {"label": "FastAPI", "count": 2}


async def test_empty_database(client):
    assert (await client.get("/api/v1/projects")).json()["rows"] == []
    assert (await client.get("/api/v1/tags")).json() == []
    assert (await client.get("/api/v1/projects", params={"tag": "FastAPI"})).status_code == 422


async def test_nul_byte_in_slug_is_404(client, seeded):
    r = await client.get("/api/v1/projects/a%00b")
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"
