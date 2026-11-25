# Backend API (Milestone 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A tested FastAPI + PostgreSQL API that serves the portfolio's projects, tags, skills and experience and accepts contact messages, ready for the React frontend in Milestone 2.

**Architecture:**
- An app factory (`create_app(settings)`) wires settings, an async SQLAlchemy engine, the `/api/v1` routers and one JSON error envelope.
- Alembic owns the schema, and a YAML seed script owns the content.
- Tests run against a real PostgreSQL database through `httpx.AsyncClient` with `ASGITransport`.

**Tech Stack:**
- Python 3.12 and uv
- FastAPI 0.165
- SQLAlchemy 2.1 (async) with psycopg 3.3
- Alembic 1.20
- Pydantic 2.14 and pydantic-settings 2.16
- PyYAML
- pytest 9, pytest-asyncio 1.5 and httpx 0.28
- ruff

**Spec:** `docs/superpowers/specs/2026-11-25-portfolio-design.md` (section "Backend"; layout in "Architecture").

## Global Constraints

- All backend code lives in `backend/`. The seed YAML lives in `seed/` at the repo root.
- Python 3.12. Dependencies are declared in `backend/pyproject.toml` and locked with `uv.lock`.
- The database URL scheme is `postgresql+psycopg://`. Every query is parameterized (SQLAlchemy expressions only), with no string-built SQL.
- Configuration comes only from environment variables (`.env` is allowed locally), with `backend/.env.example` committed. Secrets are never committed.
- CORS allows only origins listed in `CORS_ORIGINS`.
- Every error response uses the envelope `{"error": {"code": str, "message": str, "details": list}}`. The one exception is `/healthz`, which returns `{"status", "db"}` so uptime monitors can read it.
- Error codes, exactly:
  - `validation_error` (422)
  - `unknown_tag` (422)
  - `not_found` (404)
  - `rate_limited` (429)
  - `db_unavailable` (503)
  - `internal_error` (500)
- Contact rate limit: 5 messages per hour per IP hash.
- The IP hash is `sha256(IP_HASH_SALT + ip)` in hex. Raw IPs are never stored.
- `ruff check .` and `ruff format --check .` must pass at the end of every task.

## Review Focus

- **Tag casing, whitespace and duplicates:** `?tag= FastAPI &tag=fastapi` behaves like a single `FastAPI` filter, not a 422. Test in Task 4.
- **Empty database:**
  - `/projects` returns `{"rows": [], "count": 0, ...}`.
  - `/tags`, `/skills` and `/experience` return `[]`.
  - Any tag filter returns 422 `unknown_tag`.
  - Tests in Tasks 4 and 5.
- **Database unreachable:** any endpoint answers 503 `db_unavailable` in the envelope, never a 500 stack trace. Tests in Task 1 (health) and Task 6 (contact).
- **Spoofed `X-Forwarded-For`:** ignored unless `TRUST_PROXY_HEADERS=true`. When trusted, only the first address counts. Test in Task 6.
- **Hostile contact input:** 2,001-character messages, emoji and `<script>` text. The first gives a 422; the others are stored exactly as sent and returned as JSON only. Test in Task 6.

---

## Prerequisites (once, before Task 1)

The tests need an empty PostgreSQL 16 database and a role that may create databases (the migration test creates a throwaway one). Either:
- `docker compose up -d db` (after Task 7 adds the compose file), or
- a local server.

Export:

```bash
export TEST_DATABASE_URL=postgresql+psycopg://portfolio:portfolio@localhost:5432/portfolio_test
```

---

### Task 1: Scaffold, settings, app factory, error envelope, CORS and `/healthz`

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/.python-version` (`3.12`)
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/db.py`
- Create: `backend/app/errors.py`
- Create: `backend/app/main.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/v1/__init__.py`
- Create: `backend/app/models.py` (only `Base` for now)
- Test: `backend/tests/conftest.py`
- Test: `backend/tests/test_health.py`
- Test: `backend/tests/test_cors_and_errors.py`

**Interfaces:**
- Produces:
  - `app.config.Settings(BaseSettings)` with these fields:
    - `database_url: str`
    - `cors_origins: list[str] = ["http://localhost:5173"]`
    - `ip_hash_salt: str`
    - `trust_proxy_headers: bool = False`
    - `contact_limit_per_hour: int = 5`
    - It reads env names in upper case and `.env`.
  - `app.config.get_settings() -> Settings` (cached).
  - `app.db.make_engine(url: str) -> AsyncEngine`.
  - `app.db.get_session(request: Request) -> AsyncIterator[AsyncSession]`, a FastAPI dependency that reads `request.app.state.sessionmaker`.
  - `app.errors.ApiError(status: int, code: str, message: str, details: list | None = None)` (Exception).
  - `app.errors.install_error_handlers(app: FastAPI) -> None`.
  - `app.main.create_app(settings: Settings | None = None) -> FastAPI`. The app is run with `uvicorn app.main:create_app --factory`.
  - `app.models.Base` (SQLAlchemy `DeclarativeBase`).
  - `app.api.v1.router: APIRouter` (prefix `/api/v1`).
  - Test fixtures in `conftest.py`:
    - `settings` (`TEST_DATABASE_URL`, `ip_hash_salt="test-salt"`)
    - `client` (`httpx.AsyncClient` on `create_app(settings)`)
    - `db_session` (`AsyncSession`)
    - an autouse fixture that truncates all tables with `RESTART IDENTITY CASCADE` before each test
    - a session fixture that runs `Base.metadata.drop_all` then `create_all` once.

- [ ] **Step 1: Create `backend/pyproject.toml`**
  - Runtime dependencies:
    - `fastapi>=0.165`
    - `uvicorn[standard]>=0.54`
    - `sqlalchemy[asyncio]>=2.1`
    - `psycopg[binary]>=3.3`
    - `alembic>=1.20`
    - `pydantic>=2.14`
    - `pydantic-settings>=2.16`
    - `email-validator>=2.2`
    - `pyyaml>=6.0`
  - Dev group: `pytest>=9`, `pytest-asyncio>=1.5`, `httpx>=0.28`, `ruff>=0.17`.
  - `[tool.pytest.ini_options]`:
    - `asyncio_mode="auto"`
    - `asyncio_default_fixture_loop_scope="session"`
    - `asyncio_default_test_loop_scope="session"`
    - `testpaths=["tests"]`
  - `[tool.ruff]`: `line-length=100`, `target-version="py312"`, lint rules `E,F,I,B,UP,ASYNC`.
  - Run `cd backend && uv sync` and expect `uv.lock` to be created.

- [ ] **Step 2: Write the failing tests**

```python
# tests/test_health.py
async def test_healthz_ok(client):
    r = await client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "db": "ok"}

async def test_healthz_db_down_returns_503_envelope(settings):
    bad = settings.model_copy(update={"database_url": "postgresql+psycopg://x:x@127.0.0.1:1/none"})
    async with make_client(create_app(bad)) as c:
        r = await c.get("/healthz")
    assert r.status_code == 503
    assert r.json() == {"status": "degraded", "db": "down"}

# tests/test_cors_and_errors.py
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
    assert r.json() == {"error": {"code": "internal_error", "message": "Internal server error", "details": []}}
```

`make_client(app, raise_app_exceptions=True)` is a small helper in `conftest.py`: an async context manager returning `httpx.AsyncClient(transport=ASGITransport(app=app, raise_app_exceptions=...), base_url="http://test")`.

- [ ] **Step 3: Run and confirm they fail**

Run: `uv run pytest tests/test_health.py tests/test_cors_and_errors.py -v`
Expected: errors on importing `app.main`.

- [ ] **Step 4: Implement the config, db, errors, main and conftest interfaces above**
  - `/healthz` lives in `main.py` (outside `/api/v1`). It runs `SELECT 1`: 200 `{"status":"ok","db":"ok"}` on success, and 503 `{"status":"degraded","db":"down"}` on any `sqlalchemy.exc.DBAPIError` or `OSError`.
  - Error handlers map:
    - `ApiError` → its status, code, message and details;
    - `RequestValidationError` → 422 `validation_error`, with `details` set to Pydantic's `errors()` keeping only `loc`, `msg` and `type`;
    - Starlette `HTTPException` 404 → `not_found`;
    - `sqlalchemy.exc.DBAPIError` → 503 `db_unavailable` with message `"Database unavailable"`;
    - any other `Exception` → 500 `internal_error`, with the exception logged (`logging.exception`) and never echoed.
  - The engine is created in `create_app` and disposed in the lifespan shutdown.
  - `CORSMiddleware` gets `allow_origins=settings.cors_origins`, `allow_methods=["GET","POST"]` and `allow_headers=["Content-Type"]`.

- [ ] **Step 5: Run and confirm they pass, plus lint**

Run: `uv run pytest -v && uv run ruff check . && uv run ruff format --check .`
Expected: 6 passed, and ruff clean.

- [ ] **Step 6: Commit**

```bash
git add backend && git commit -m "feat(backend): scaffold app factory, settings, error envelope, CORS, healthz"
```

---

### Task 2: Models and the first Alembic migration

**Files:**
- Modify: `backend/app/models.py`
- Create: `backend/alembic.ini`
- Create: `backend/migrations/env.py` (async template)
- Create: `backend/migrations/script.py.mako`
- Create: `backend/migrations/versions/0001_initial.py`
- Test: `backend/tests/test_migrations.py`

**Interfaces:**
- Consumes: `Base`, `get_settings()`.
- Produces these ORM classes (tables in parentheses):
  - `Project` (`projects`):
    - `id int pk`, `slug str(80) unique not null`, `name str(120) not null`, `summary str(300) not null`, `body_md text not null default ''`
    - `stack ARRAY(String(40)) not null default '{}'`
    - `status str(10) not null` with check `status in ('live','wip','archived')`
    - `repo_url str(300) null`, `live_url str(300) null`, `started_on date null`
    - `featured bool not null default false`, `sort_order int not null default 0`
    - `created_at`, `updated_at timestamptz not null default now()`
    - Index `ix_projects_stack_gin` (GIN on `stack`).
  - `Skill` (`skills`): `id`, `name str(60) unique not null`, `category str(40) not null`, `years numeric(3,1) null`, `sort_order int not null default 0`.
  - `Experience` (`experience`):
    - `id`, `kind str(10) not null` with check `kind in ('education','work','training')`
    - `org str(120) not null`, `title str(120) not null`, `start date not null`, `end date null`
    - `highlights ARRAY(String(300)) not null default '{}'`
    - Unique constraint `uq_experience_natural` on `(kind, org, title, start)`.
  - `ContactMessage` (`contact_messages`): `id`, `name str(100)`, `email str(254)`, `message text`, `ip_hash str(64)`, `created_at timestamptz default now()`, plus index `ix_contact_ip_created` on `(ip_hash, created_at)`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_migrations.py
async def test_upgrade_head_creates_schema_and_downgrade_removes_it(tmp_database_url):
    run_alembic(tmp_database_url, "upgrade", "head")
    tables = await table_names(tmp_database_url)
    assert {"projects", "skills", "experience", "contact_messages"} <= tables
    assert "ix_projects_stack_gin" in await index_names(tmp_database_url, "projects")
    run_alembic(tmp_database_url, "downgrade", "base")
    assert {"projects", "skills", "experience", "contact_messages"}.isdisjoint(await table_names(tmp_database_url))
```

Fixtures and helpers:
- `tmp_database_url` (in `conftest.py`) uses an AUTOCOMMIT connection to `CREATE DATABASE <test db>_mig_<random hex>`, yields its URL, then drops it.
- `run_alembic(url, *args)` calls `alembic.command` with a `Config("alembic.ini")` whose `sqlalchemy.url` is set to `url`.
- `migrations/env.py` reads `config.get_main_option("sqlalchemy.url")` first and falls back to `get_settings().database_url`.

- [ ] **Step 2: Run it to confirm it fails**

Run: `uv run pytest tests/test_migrations.py -v`. Expected: FAIL (no alembic config).

- [ ] **Step 3: Implement the models and write `0001_initial.py` by hand, matching them**
  - `downgrade` drops all four tables.
  - Generate it with `alembic revision --autogenerate`, then review it against the Interfaces block.

- [ ] **Step 4: Run the full suite**

Run: `uv run pytest -v && uv run ruff check . && uv run ruff format --check .`. Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(backend): add models and initial alembic migration"
```

---

### Task 3: Idempotent YAML seed

**Files:**
- Create: `backend/app/seed.py`
- Create: `seed/projects.yaml`
- Create: `seed/skills.yaml`
- Create: `seed/experience.yaml`
- Test: `backend/tests/test_seed.py`
- Test fixture data: `backend/tests/seed_fixture/{projects,skills,experience}.yaml`

**Interfaces:**
- Consumes: `Project`, `Skill`, `Experience`, `db_session`.
- Produces:
  - `app.seed.SeedReport` (dataclass: `projects: int, skills: int, experience: int`).
  - `async def load_seed(session: AsyncSession, seed_dir: Path) -> SeedReport`. It upserts with `insert(...).on_conflict_do_update` on `slug`, on `name`, and on `uq_experience_natural`, and returns the row counts per table after the load.
  - CLI: `uv run python -m app.seed [--dir PATH]`. The default dir is `Path(__file__).parents[2] / "seed"`. It prints the counts.

- [ ] **Step 1: Write the failing tests**

```python
async def test_seed_loads_fixture(db_session):
    report = await load_seed(db_session, FIXTURE_DIR)
    assert report == SeedReport(projects=3, skills=4, experience=2)

async def test_seed_is_idempotent_and_updates(db_session, tmp_path):
    await load_seed(db_session, FIXTURE_DIR)
    copy_fixture(tmp_path, edit={"projects.yaml": ("summary: Old", "summary: New")})
    report = await load_seed(db_session, tmp_path)
    assert report == SeedReport(projects=3, skills=4, experience=2)
    assert (await get_project(db_session, "alpha")).summary == "New"

async def test_seed_rejects_bad_status(db_session, tmp_path):
    write_yaml(tmp_path, "projects.yaml", [{"slug": "x", "name": "X", "summary": "s", "status": "done"}])
    with pytest.raises(ValueError, match="status"):
        await load_seed(db_session, tmp_path)
```

- The fixture data has 3 projects:
  - `alpha`: stack `[FastAPI, PostgreSQL]`, `featured: true`, `sort_order: 1`, `summary: Old`;
  - `beta`: stack `[FastAPI, React]`, `sort_order: 2`;
  - `gamma`: stack `[Python]`, status `archived`, `sort_order: 3`.
- It also has 4 skills and 2 experience rows.
- Validate each YAML record through Pydantic models in `seed.py` before writing. A bad `status` or `kind` raises `ValueError` naming the field.

- [ ] **Step 2: Run them to confirm they fail.** `uv run pytest tests/test_seed.py -v` → import error.

- [ ] **Step 3: Implement `load_seed`, and write the real seed files**

`seed/projects.yaml` holds 3 projects:
- `portfolio`: "This portfolio", status `wip`, featured, stack `[React, TypeScript, FastAPI, PostgreSQL]`.
- `final-year-project` and `mini-project`: each with the summary "Placeholder: replace with the real project details." and status `wip`.

`seed/skills.yaml` holds Python, SQL, FastAPI, PostgreSQL, Git and Docker with categories, and `years: null`.

`seed/experience.yaml` holds one education row for the B.Tech, with org "College name (placeholder)".

Placeholders are marked in their text so they can't ship unnoticed.

- [ ] **Step 4: Run all tests and lint.** Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend seed && git commit -m "feat(backend): add idempotent yaml seed and initial content"
```

---

### Task 4: Projects and tags endpoints

**Files:**
- Create: `backend/app/schemas.py`
- Create: `backend/app/api/v1/projects.py`
- Modify: `backend/app/api/v1/__init__.py` (include the router)
- Test: `backend/tests/test_projects.py`

**Interfaces:**
- Consumes: `get_session`, `ApiError`, `Project`, `load_seed` plus `FIXTURE_DIR`. A `seeded` fixture in `conftest.py` loads the fixture seed.
- Produces these schemas:
  - `ProjectOut`: `slug, name, summary, stack: list[str], status, repo_url: str|None, live_url: str|None, started_on: date|None, featured: bool`.
  - `ProjectDetail(ProjectOut)`: adds `body_md: str`.
  - `ProjectList`: `rows: list[ProjectOut], count: int, elapsed_ms: float`.
  - `TagOut`: `label: str, count: int`.
- Routes:
  - `GET /api/v1/projects?tag=` (repeatable, at most 5 after de-duplication):
    - Tag matching is case-insensitive and trims whitespace.
    - Each tag is resolved to the stored label using the known-tag set. An unknown tag gives 422 `unknown_tag` with `details=[{"tag": <input>}]`.
    - The filter is AND: `Project.stack.contains([labels])`.
    - Order: `featured desc, sort_order asc, started_on desc nulls last`.
    - `elapsed_ms` is measured with `time.perf_counter()` around the query and rounded to 1 decimal place.
  - `GET /api/v1/projects/{slug}` returns `ProjectDetail`, or 404 `not_found`.
  - `GET /api/v1/tags` returns `list[TagOut]`, sorted by count descending, then label ascending. It uses `unnest(stack)` grouped.

- [ ] **Step 1: Write the failing tests**

```python
async def test_list_orders_featured_first(client, seeded):
    r = await client.get("/api/v1/projects")
    assert [p["slug"] for p in r.json()["rows"]] == ["alpha", "beta", "gamma"]
    assert r.json()["count"] == 3 and r.json()["elapsed_ms"] >= 0
    assert "body_md" not in r.json()["rows"][0]

async def test_filter_is_and(client, seeded):
    r = await client.get("/api/v1/projects", params=[("tag", "FastAPI"), ("tag", "React")])
    assert [p["slug"] for p in r.json()["rows"]] == ["beta"]

async def test_tag_case_whitespace_and_duplicates(client, seeded):
    r = await client.get("/api/v1/projects", params=[("tag", " fastapi "), ("tag", "FASTAPI")])
    assert r.status_code == 200 and r.json()["count"] == 2

async def test_unknown_tag_is_422_envelope(client, seeded):
    r = await client.get("/api/v1/projects", params={"tag": "cobol"})
    assert r.status_code == 422
    assert r.json()["error"] == {"code": "unknown_tag", "message": "Unknown tag", "details": [{"tag": "cobol"}]}

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
```

- [ ] **Step 2: Run them to confirm they fail.** `uv run pytest tests/test_projects.py -v`

- [ ] **Step 3: Implement the schemas and the router as specified in Interfaces**

- [ ] **Step 4: Run all tests and lint.** Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(backend): add projects, project detail and tags endpoints"
```

---

### Task 5: Skills and experience endpoints

**Files:**
- Modify: `backend/app/schemas.py`
- Create: `backend/app/api/v1/meta.py`
- Modify: `backend/app/api/v1/__init__.py`
- Test: `backend/tests/test_meta.py`

**Interfaces:**
- Produces:
  - `SkillOut`: `name, category, years: float|None`.
  - `ExperienceOut`: `kind, org, title, start: date, end: date|None, highlights: list[str]`.
  - `GET /api/v1/skills` returns skills ordered by `category asc, sort_order asc, name asc`.
  - `GET /api/v1/experience` returns rows ordered by `start desc`.

- [ ] **Step 1: Write the failing tests**

```python
async def test_skills_order(client, seeded):
    names = [s["name"] for s in (await client.get("/api/v1/skills")).json()]
    assert names == EXPECTED_SKILL_ORDER  # constant built from the fixture yaml in conftest

async def test_experience_newest_first(client, seeded):
    rows = (await client.get("/api/v1/experience")).json()
    assert rows[0]["start"] > rows[1]["start"] and isinstance(rows[0]["highlights"], list)

async def test_meta_empty_database(client):
    assert (await client.get("/api/v1/skills")).json() == []
    assert (await client.get("/api/v1/experience")).json() == []
```

- [ ] **Step 2: Run them to confirm they fail.** **Step 3: Implement.** **Step 4: Run all tests and lint.** Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(backend): add skills and experience endpoints"
```

---

### Task 6: Contact endpoint with honeypot and rate limit

**Files:**
- Create: `backend/app/api/v1/contact.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/api/v1/__init__.py`
- Test: `backend/tests/test_contact.py`

**Interfaces:**
- Consumes: `Settings.ip_hash_salt`, `Settings.trust_proxy_headers`, `Settings.contact_limit_per_hour`, `ContactMessage`.
- Produces:
  - `ContactIn`:
    - `name: str` (stripped, 1–100 characters)
    - `email: EmailStr`
    - `message: str` (stripped, 10–2,000 characters)
    - `website: str = ""` (the honeypot).
  - `ContactAccepted`: `status: Literal["received"]`.
  - `app.api.v1.contact.client_ip(request: Request, trust_proxy: bool) -> str`: the first `X-Forwarded-For` entry when trusted, otherwise `request.client.host`.
  - `app.api.v1.contact.hash_ip(ip: str, salt: str) -> str`.
  - `POST /api/v1/contact` returns 202 `{"status":"received"}`:
    - A non-empty honeypot gives the same 202 but stores nothing.
    - It returns 429 `rate_limited` when the IP hash already has `contact_limit_per_hour` rows in the last hour.

- [ ] **Step 1: Write the failing tests**

```python
VALID = {"name": "Asha", "email": "asha@example.com", "message": "Hello, I would like to talk."}

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
    await insert_contacts(db_session, n=5, ip_hash=hash_ip("127.0.0.1", "test-salt"), age_minutes=61)
    assert (await client.post("/api/v1/contact", json=VALID)).status_code == 202

@pytest.mark.parametrize("field,value", [("email", "not-an-email"), ("message", "short"), ("message", "x" * 2001), ("name", "   ")])
async def test_invalid_input_is_422(client, field, value):
    r = await client.post("/api/v1/contact", json={**VALID, field: value})
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"

async def test_unicode_and_html_stored_verbatim(client, db_session):
    msg = "Namaste 🙏 <script>alert(1)</script> — let's talk"
    await client.post("/api/v1/contact", json={**VALID, "message": msg})
    assert (await only_contact_row(db_session)).message == msg

async def test_forwarded_for_ignored_unless_trusted(settings):
    for trust, expected_ip in [(False, "127.0.0.1"), (True, "203.0.113.9")]:
        app = create_app(settings.model_copy(update={"trust_proxy_headers": trust}))
        ...  # post once with X-Forwarded-For: "203.0.113.9, 10.0.0.1", assert the stored ip_hash == hash_ip(expected_ip, "test-salt")

async def test_contact_db_down_is_503(settings):
    bad = settings.model_copy(update={"database_url": "postgresql+psycopg://x:x@127.0.0.1:1/none"})
    async with make_client(create_app(bad)) as c:
        r = await c.post("/api/v1/contact", json=VALID)
    assert r.status_code == 503 and r.json()["error"]["code"] == "db_unavailable"
```

`httpx`'s `ASGITransport` reports the client as `127.0.0.1`. The helper `insert_contacts` sets `created_at = now() - interval`.

- [ ] **Step 2: Run them to confirm they fail.** **Step 3: Implement.**
  - Do the rate-limit count and the insert in one transaction: `SELECT count(*) ... WHERE ip_hash=:h AND created_at > now() - interval '1 hour'`.

- [ ] **Step 4: Run all tests and lint.** Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat(backend): add contact endpoint with honeypot and rate limit"
```

---

### Task 7: Run it locally: Dockerfile, compose and README

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`
- Create: `docker-compose.yml`
- Create: `backend/README.md`
- Modify: `.gitignore` (create it if missing: `.env`, `.venv/`, `__pycache__/`, `.ruff_cache/`, `.pytest_cache/`)

**Interfaces:**
- Produces:
  - The `db` service: `postgres:16`, with a `portfolio`/`portfolio` role and database `portfolio`, port `5432`, a healthcheck (`pg_isready`), and a named volume.
  - The `api` service: builds `backend/`, `depends_on: db (healthy)`, environment from `backend/.env`, and the command `alembic upgrade head && uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000`, on port `8000`.
  - `Dockerfile`:
    - base `python:3.12-slim`;
    - copies `uv` from `ghcr.io/astral-sh/uv`;
    - runs `uv sync --frozen --no-dev`;
    - runs as a non-root user.

- [ ] **Step 1: Write the files above.** The README covers:
  - setup (`uv sync`, `cp .env.example .env`);
  - starting the database (`docker compose up -d db`);
  - `alembic upgrade head` and `python -m app.seed`;
  - running the server;
  - running the tests with `TEST_DATABASE_URL`;
  - the endpoint list with one `curl` example each;
  - the error envelope;
  - how rate limiting and the honeypot work.

- [ ] **Step 2: End-to-end check against a fresh database**

```bash
uv run alembic upgrade head && uv run python -m app.seed
uv run uvicorn app.main:create_app --factory --port 8000 &
curl -s localhost:8000/healthz            # {"status":"ok","db":"ok"}
curl -s "localhost:8000/api/v1/projects?tag=fastapi" | python -m json.tool   # count 1 (portfolio)
curl -s localhost:8000/api/v1/tags
```

Expected: the outputs shown in the comments. Then stop the server.

- [ ] **Step 3: If a Docker daemon is available, run `docker compose up --build -d` and repeat the curls on port 8000.** If not, record in the commit message that the compose file was not exercised here.

- [ ] **Step 4: Full suite and lint, one last time:** `uv run pytest -v && uv run ruff check . && uv run ruff format --check .`

- [ ] **Step 5: Commit**

```bash
git add backend docker-compose.yml .gitignore && git commit -m "chore(backend): add Dockerfile, compose file and backend README"
```
