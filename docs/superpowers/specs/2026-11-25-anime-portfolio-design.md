# Plan: anime/manga-style portfolio with an agent-build intro

## Context

The user is a fresh B.Tech graduate targeting Python backend + AI roles (FastAPI, PostgreSQL, Git). The portfolio is **project #1**. It must be built to production standard (tests, CI, Docker, deployed, clear README) so it's worth showing on its own.

They studied project.fahimweb.online with REA (findings: `reports/Portfolio site animation smoothness.md`). They want:
- their own style, with **no gradient-heavy "AI slop"**;
- the **agent-build intro mechanic**: cursor "agents" scan the page and build it piece by piece.

**Decisions from the user**
- **Audience:** recruiters for backend + AI roles. After the intro they should open projects / GitHub and download the resume.
- **Visual world:** **original anime/manga energy**, inspired by anime openings and fight scenes, plus award-winning creative websites.
  - The final look is chosen from **3 live animated mockups** (Milestone 0).
  - No Bleach, Spider-Man or other copyrighted characters, names or logos. All art and characters are our own.
- **Intro fidelity:** **same mechanic, our style.** Behaviour and pacing match the reference; the cursors, HUD and colours are restyled to the chosen theme.
- **Architecture:** **React SPA + separate FastAPI API** (user's choice).
- **Backend:** FastAPI + PostgreSQL serves projects / skills / experience and the contact form, with tests.
- **Projects:** the user has **final-year and mini college projects**. These are cleaned up and listed, along with the portfolio itself, with honest `status` values.
- **Who codes:** Claude writes all the code and explains each part. Each milestone ends with 2–3 interview-style questions.
- **Timeline:** no deadline. Claude still ships v1 first, then extras.

**Originality rule:** the intro is a clean-room rebuild of the *mechanic* in our own code. Nothing is copied from the reference's minified JS. The README credits the inspiration.

## Goals / non-goals / anti-goals

- **Goals:**
  - a stunning but fast anime/manga-styled site;
  - the agent-build intro;
  - real data from FastAPI + PG;
  - resume download and a contact form;
  - smooth on phones and laptops;
  - CI-tested and deployed.
- **Non-goals for v1:**
  - AI chat;
  - admin UI (content comes from a seed script);
  - email notifications;
  - blog.
- **Anti-goals:**
  - gradients or glow blobs, or a template look;
  - using copyrighted characters or logos;
  - a recruiter unable to find projects and resume within 10 seconds;
  - the intro freezing the page (the reference had a 707 ms long task);
  - a blank page when the free-tier API is cold;
  - unskippable motion, or ignoring reduced-motion settings.

## Milestone 0: visual exploration (throwaway spike, first step after approval)

Claude builds **3 short animated mockups** as private Artifact pages the user can open on a phone and a laptop. Each mockup covers:
- a hero;
- one transition into a projects section;
- one project card with a hover or tap interaction.

All three use the same placeholder content and an original visual language:

1. **"Opening sequence"**
   - The page plays like an anime opening: kinetic title cards slam in, with impact frames (a 1–2 frame inverted flash), speed lines and smash-cut section changes on scroll.
   - Palette: ink black, paper white, and one vermilion "hanko seal" accent.
2. **"Manga chapter"**
   - The site reads like a manga chapter: panel grid, screentone shading, ink outlines, caption boxes.
   - Scrolling moves panel to panel. Projects are chapters, and hover pops a panel with speed lines.
   - Black and white plus one spot colour.
3. **"Ink & blade"**
   - Cinematic sumi-e: SVG brush strokes draw themselves, ink bleeds into a paper texture, and a diagonal "blade slash" reveals the next section.
   - Vertical type accents, and a red hanko seal with the user's initials as the logo.

The user picks one, or a mix. The winner becomes the design tokens: colours, fonts, motion rules and how the intro is restyled. All spike code is then deleted.

Fonts are picked from Google Fonts during the spike. Candidates:
- Japanese display: Dela Gothic One, Shippori Mincho, Yuji Syuku;
- Latin: a strong condensed display face plus a clean text face.

## Architecture (monorepo in this repo, `Katen-Kyokotsu`)

```
backend/            FastAPI app (Python 3.12)
  app/main.py         app factory, CORS from env, /healthz
  app/config.py       pydantic-settings (DATABASE_URL, CORS_ORIGINS, ...)
  app/db.py           SQLAlchemy 2.1 async engine/session (psycopg 3)
  app/models.py       Project, Skill, Experience, ContactMessage
  app/schemas.py      Pydantic v2 models
  app/api/v1/         projects.py, meta.py, contact.py
  app/seed.py         loads seed/*.yaml (idempotent upsert)
  migrations/         Alembic
  tests/              pytest + httpx AsyncClient on real Postgres
frontend/           React 19 + Vite 8 + TypeScript
  src/agent-build/    framework-free intro engine (TS, zero deps)
  src/theme/          tokens from the chosen mockup
  src/components/ src/sections/   Hero, Projects, Skills, Experience, Contact
  src/api/            typed client + TanStack Query hooks
  src/fallback/       build-time JSON snapshot of seed data
  public/resume.pdf
seed/               profile.yaml, projects.yaml, skills.yaml, experience.yaml
docker-compose.yml  postgres + backend
.github/workflows/ci.yml
docs/superpowers/specs/   design doc (committed after approval)
```

**Versions (checked 2026-11-24)**
- Frontend:
  - React 19.3
  - Vite 8.3
  - TypeScript 7.0
  - Tailwind 4.3
  - Motion 14.14
  - Lenis 1.3 (desktop wheel smoothing; native scroll on touch)
  - TanStack Query 5
  - Vitest 5
  - Playwright 1.65
- Backend:
  - FastAPI 0.165
  - SQLAlchemy 2.1
  - Alembic 1.20
  - psycopg 3.3
  - Pydantic 2.14
  - pydantic-settings 2.16
  - pytest 9
  - ruff

Animation uses SVG, CSS and Motion first. WebGL is only added if the chosen mockup truly needs it, and then it is lazy-loaded, its pixel ratio capped and its quality adaptive, following the reference's 3D tricks.

## Backend

**Tables**
- `projects`: `slug`, `name`, `summary`, `body_md`, `stack text[]`, `status` (live / wip / archived), `repo_url`, `live_url`, `started_on`, `featured`, `sort_order`.
- `skills`: `name`, `category`, `years`, `sort_order`.
- `experience`: `kind` (education / work / training), `org`, `title`, `start`, `end`, `highlights text[]`.
- `contact_messages`: `name`, `email`, `message`, `created_at`, `ip_hash`.
- Indexes: GIN on `stack`.

**Endpoints (`/api/v1`)**
- `GET /projects?tag=...`
  - Tags are validated against the known set (422 otherwise).
  - Parameterized query.
  - Response: `{rows, count, elapsed_ms}`.
- `GET /projects/{slug}`
- `GET /tags`
- `GET /skills`
- `GET /experience`
- `POST /contact`
  - Validation and a honeypot field.
  - Rate limit of 5 per hour per IP hash, stored in Postgres.
- `GET /healthz`

**Production practices**
- Env-var configuration, with `.env.example` committed.
- CORS allows only the frontend origin.
- Structured errors.
- Alembic migrations.
- Seed script for content.
- Tests cover filters, validation, rate limit, honeypot and health.

## Frontend (final look comes from Milestone 0)

- **Sections:** Hero (name, role, CTAs: resume + GitHub), Projects (filter by tag, expandable detail), Skills, Experience/Education, Contact form.
  - A footer "Replay the build" link replays the intro.
- **Recruiter-friendly:**
  - A visible "Plain view" toggle gives a fast, scannable, printable layout with motion off.
  - Projects and resume are reachable in one click from the hero.
- **Resilience:** content renders instantly from the fallback JSON, and live API data replaces it when it arrives.
- **Accessibility:** a skip link, semantic markup, focus styles, AA contrast, and `prefers-reduced-motion` respected everywhere.
- **Performance budget:**
  - Lighthouse mobile ≥ 90;
  - no long task over 200 ms during the intro;
  - only `transform`, `opacity`, `clip-path` and SVG stroke properties are animated.

## Agent-build intro (`frontend/src/agent-build/`)

This is the clean-room mechanic, restyled to the chosen theme (for example, agents as ink brushes or inkers, frames as panel borders). The behaviour follows the REA findings.

- **Gate:**
  - Skipped when any of these hold:
    - reduced motion;
    - a low-tier device (`saveData`, `deviceMemory < 4`, or `hardwareConcurrency < 4`);
    - a bot or headless user agent;
    - a `#hash` deep link;
    - `sessionStorage` says it was already seen.
  - `?build` forces it.
- **Phases:** scan (about 1.7 s), then build, then done (the overlay fades out, and a toast shows the agent count and time, with Replay).
- **Hide / show:** `html.ab-building` hides the page, and each element's `data-ab` goes from `off` to `on`.
- **Classify** each element as text / box / media / icon / decor, with opt-in `data-ab-*` attributes.
- **Agents:**
  - desktop: 18 growing to 30, plus trails and guides;
  - touch or low tier: 8 growing to 14, no extras.
  - Three tool states, as in the reference: pointer, crosshair, text cursor. They are drawn in the theme.
- **Dispatcher:** runs every 70 ms. It takes unbuilt elements in the top 86 % of the viewport (at most 260) and assigns each to the nearest free agent.
- **Jobs:**
  - **Text** is revealed line by line with a `clip-path` polygon that follows the cursor. Duration is `clamp(0.24 + len*0.014, 0.3, 1.5) * scale`.
  - **Box / media:** a frame with handles and a live "W × H" label grows with ease-out-cubic, then the element fades in through WAAPI.
- **Motion maths:**
  - easing `1 - exp(-k*dt)`;
  - `k` = 15 on a job, 3.2 wandering, 30 for trails;
  - `dt` capped at 50 ms;
  - sizes are written only when the rounded value changes.
- **Pacing (Claude's call):** keep the reference's pace per element.
  - Target time is `clamp(layers × 44/553, 12, 44)` s on desktop, with the same scaling from 26 s on touch.
  - Auto-scroll speed is chosen to finish at that time.
- **Exit:**
  - The build ends when everything is built and the page has reached the bottom, at a 150 s cap, or on an error.
  - Wheel, touch, keys, an outside click, focus, Escape or the Skip button skip it.
  - The HUD shows agents, built / total, phase, speed 1× / 2× / 4×, a sound toggle (off by default) and Skip.
- **Better than the reference:**
  - a time-sliced scan (about 8 ms per frame);
  - rect reads batched before writes;
  - pooled agent nodes;
  - pure, unit-tested logic for the gate, classification, line merging, easing and scheduling.
- **React:** a `useAgentBuild()` hook starts the engine after first paint and fonts are ready, and exposes `replay()`.

## Milestones (each ends with an explanation + 2–3 interview questions)

0. **Visual exploration:** 3 animated mockups. The user picks, then the tokens are locked.
1. **Backend:** models, migrations, seed (with the user's college projects), endpoints, tests, docker-compose.
2. **Frontend shell:** theme tokens, sections, API hooks, fallback JSON, Plain view.
3. **Agent-build engine:** unit tests, overlay and HUD, integration, Playwright tests.
4. **Signature animations** from the chosen mockup, contact flow, 404, accessibility and performance pass.
5. **CI and deploy:**
   - GitHub Actions: ruff + pytest with a Postgres service; tsc + vitest + build + Playwright smoke test.
   - Deploy targets: frontend on Vercel, API on Render, database on Neon.
6. **v1.1 extras:** a Ctrl+K command palette, project case-study pages, email notifications.
7. **Next:** project #2 (FastAPI + AI).

**Content needed from the user** (placeholders until then):
- name and headline;
- education;
- final-year and mini project details (what, stack, role, repo links);
- skills;
- GitHub and LinkedIn URLs;
- `resume.pdf`;
- optionally, initials for the hanko-seal logo.

## Verification

- **Milestone 0:** the user opens all 3 Artifact mockups on a phone and a laptop and picks one. Claude checks each at 1440×900 and on an iPhone profile.
- **Backend:**
  - `docker compose up -d db && pytest` covers filters, 422 on unknown tags, contact validation, honeypot, rate limit and health.
  - Manual `curl` against the endpoints.
- **Engine:**
  - Vitest on the pure functions.
  - Playwright, with `?build`, checks:
    - the overlay appears;
    - there are 18 agents on desktop and 8 on an iPhone profile;
    - `data-ab` flips to `on`;
    - Skip and Escape end it;
    - reduced motion never starts it;
    - no long task over 200 ms.
- **Frontend:** `tsc --noEmit`, a production build, Lighthouse mobile ≥ 90, screenshots at both sizes.
- **End to end:**
  - The intro plays once per tab.
  - Tag filters work.
  - The contact form stores a row.
  - With the API stopped, fallback content still shows.

## Approaches considered

- **React SPA + separate FastAPI (chosen by the user):** more frontend skill shown; costs CORS and two deploys.
- **FastAPI + Jinja:** one deploy and mostly Python; not chosen.
- **Astro + FastAPI:** not chosen.
- **Visual concepts rejected by the user:** minimal, terminal, editorial, living database, request lifecycle, spec sheet, blueprint, comic ink, web threads. Spider-Man was ruled out on IP grounds.

## Left to the builder

- Component breakdown, spacing scale and copy wording.
- Exact fonts and palette values (from the spike).
- Rate-limit storage details.
- Render vs Fly.io if cold starts are slow.
