# Portfolio API

FastAPI + PostgreSQL backend for the ASCII-3D portfolio. It serves projects, tags, skills and experience, and accepts contact messages.

## Run it locally

You need [uv](https://docs.astral.sh/uv/) and either Docker or a local PostgreSQL 16.

```bash
cd backend
uv sync                          # install dependencies into .venv
cp .env.example .env             # then edit IP_HASH_SALT

docker compose up -d db          # from the repo root: starts PostgreSQL on :5432

uv run alembic upgrade head      # create the tables
uv run python -m app.seed        # sync the database to ../seed/*.yaml (safe to run again)
uv run uvicorn app.main:create_app --factory --reload --port 8000
```

Interactive API docs are at http://localhost:8000/docs.

To run the whole stack in containers instead, use `docker compose up --build` from the repo root. The API container applies migrations on start; seed it with `docker compose exec api python -m app.seed`.

## Configuration

All settings come from environment variables. See `.env.example`.

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | `postgresql+psycopg://user:pass@host:5432/db` |
| `CORS_ORIGINS` | JSON list of browser origins allowed to call the API |
| `IP_HASH_SALT` | Secret used to hash visitor IPs. Raw IPs are never stored |
| `TRUST_PROXY_HEADERS` | `true` only behind a proxy that sets `X-Forwarded-For` |
| `TRUSTED_PROXY_HOPS` | Number of trusted proxies in front of the app (default 1). The client IP is taken this many entries from the right of `X-Forwarded-For` |
| `CONTACT_LIMIT_PER_HOUR` | Contact messages allowed per visitor per hour (default 5) |

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/healthz` | `{"status":"ok","db":"ok"}`, or 503 `{"status":"degraded","db":"down"}` |
| GET | `/api/v1/projects?tag=FastAPI&tag=React` | AND filter, case-insensitive, at most 5 tags. Returns `{rows, count, elapsed_ms}` |
| GET | `/api/v1/projects/{slug}` | One project, including `body_md` |
| GET | `/api/v1/tags` | `[{label, count}]`, most used first |
| GET | `/api/v1/skills` | Ordered by category |
| GET | `/api/v1/experience` | Newest first |
| POST | `/api/v1/contact` | `{name, email, message, website}` returns 202 `{"status":"received"}` |

```bash
curl localhost:8000/healthz
curl "localhost:8000/api/v1/projects?tag=fastapi"
curl localhost:8000/api/v1/projects/portfolio
curl localhost:8000/api/v1/tags
curl localhost:8000/api/v1/skills
curl localhost:8000/api/v1/experience
curl -X POST localhost:8000/api/v1/contact -H 'Content-Type: application/json' \
  -d '{"name":"Asha","email":"asha@example.com","message":"Hello, let us talk."}'
```

### Errors

Every error (except `/healthz`) has one shape:

```json
{"error": {"code": "unknown_tag", "message": "Unknown tag", "details": [{"tag": "cobol"}]}}
```

| Code | Status |
|---|---|
| `validation_error` | 422 |
| `unknown_tag` | 422 |
| `not_found` | 404 |
| `rate_limited` | 429 |
| `db_unavailable` | 503 |
| `internal_error` | 500 |

### How the contact form is protected

- **Honeypot.** The real form hides a `website` field. Humans leave it empty; bots fill it in. A filled-in honeypot still gets a normal 202, so the bot learns nothing, but nothing is stored.
- **Rate limit.** Each visitor can send 5 messages per hour. The visitor is identified by `sha256(IP_HASH_SALT + ip)`, so raw IPs never reach the database. A per-visitor database lock stops two simultaneous requests from both slipping past the limit.
- **Real client IP behind a proxy.** With `TRUST_PROXY_HEADERS=true`, the IP is taken `TRUSTED_PROXY_HOPS` entries from the *right* of `X-Forwarded-For`, because that is the part your own proxy wrote. The leftmost entries come from the client and can be faked to dodge the limit.
- **Validation.**
  - NUL characters are rejected with a 422, because PostgreSQL text cannot store them.
  - `name` must be 1–100 characters and `message` 10–2,000 characters, both after trimming.
  - `email` must be a real email address.
  - Text is stored exactly as sent and only ever returned as JSON.

## Seed content

`python -m app.seed` makes the database match the YAML files in `seed/`:
- A row is added or updated for every record in a file.
- A row is **deleted** when its record is removed from the file, so replaced placeholders disappear.
- When a file is absent, its table is left alone.
- When the folder is missing or has none of the three files, the command fails instead of quietly loading nothing.

## Tests

The tests run against a real PostgreSQL database. They need an empty test database and a role that may create databases (the migration test makes a throwaway one).

```bash
docker compose exec db createdb -U portfolio portfolio_test
export TEST_DATABASE_URL=postgresql+psycopg://portfolio:portfolio@localhost:5432/portfolio_test
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

## Layout

```
app/main.py         app factory (create_app), CORS, /healthz
app/config.py       settings from environment variables
app/db.py           async engine and per-request session
app/errors.py       the JSON error envelope
app/models.py       SQLAlchemy models
app/schemas.py      request and response models
app/api/v1/         projects, meta (skills, experience), contact
app/seed.py         YAML seed loader (python -m app.seed)
migrations/         Alembic migrations
tests/              pytest suite (real PostgreSQL)
```
