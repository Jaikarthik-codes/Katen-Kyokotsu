# Portfolio front end

React 19 + TypeScript + Vite single-page app for the ASCII-3D portfolio. It reads projects, tags, skills and experience from the FastAPI service in `../backend`. The page still works when that API is asleep or down.

## Run it locally

You need Node 20.19+ or 22.12+ and, for live data, the API running on :8000 (see `../backend/README.md`).

```bash
cd frontend
npm install
cp .env.example .env     # optional: only needed if the API is not on localhost:8000
npm run dev              # http://localhost:5173
```

## Configuration

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | Base URL of the API (default `http://localhost:8000`). Read at build time |

The API must list this site's origin in its `CORS_ORIGINS`:
- `http://localhost:5173` for `npm run dev`;
- `http://localhost:4173` for `npm run preview` and the e2e tests.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit and component tests (Vitest + Testing Library, jsdom) |
| `npm run check` | Type-check plus unit tests. Run it before every push |
| `npm run e2e` | Playwright smoke tests on desktop and iPhone 13 sizes. They build and serve the app themselves, and need the API running |
| `npm run fallback` | Rebuild the offline copy from `../seed/*.yaml` (runs automatically before dev, build, test and check) |

To use an already-installed Chromium for e2e, set `PW_CHROMIUM_PATH=/path/to/chrome`.

## How the offline copy works

Free-tier APIs fall asleep, so the page must not wait for one.

1. **At build time:** `scripts/build-fallback.mjs` turns the seed YAML into `src/fallback/data.json` (git-ignored). It sorts the data the way the API does.
2. **At first paint:** every query starts with that bundled copy as its `initialData`, so there is never a loading spinner or a blank section.
3. **When the API answers:** TanStack Query swaps the bundled copy for the live data.
   - The bundled copy is marked as old (`initialDataUpdatedAt: 0`), so the live fetch always runs.
4. **The header shows which copy you are seeing:**
   - `● online`: the API answered `/healthz`.
   - `○ offline copy`: it did not. Requests time out after 4 seconds, and the status is re-checked every 30 seconds.
   - The projects line shows the database query time when the data is live.

Tag filtering works offline too: it runs on the bundled copy with the same AND rule the API uses.

## Plain view

The **Plain view** button in the header gives recruiters a fast, printable page:
- one column;
- no ASCII art;
- no animation or transitions.

The choice is saved in `localStorage` under `plain-view`. If storage is blocked, the toggle still works for the visit.

It works by setting `data-view="plain"` on `<html>`. Components style it with the Tailwind `plain:` variant, for example `plain:hidden`.

## ASCII hero performance rules

The spinning torus knot is drawn as text on a `<canvas>`, so it costs no DOM layout. It also follows these rules:

- **Sample count by device.** Normal devices get 640 × 30 surface samples. Low-tier devices get 400 × 20, where low-tier means Save-Data, under 4 GB of memory, or under 4 cores.
- **Watchdog.** If the frame rate stays under 45 fps for 2 seconds, the sample density is halved.
- **Pixel ratio capped at 2.**
- **Pauses when not visible.** It stops when it scrolls off screen (IntersectionObserver). In a hidden tab the browser already stops `requestAnimationFrame`.
- **Reduced motion.** With `prefers-reduced-motion`, it draws one still frame and never animates.
- **Accessible.** The canvas is `aria-hidden`. Screen readers get a one-line text description instead.

## Layout

```
src/api/          fetch client (4 s timeout), TanStack Query hooks, types
src/fallback/     bundled offline copy + the same tag filter as the API
src/components/   header, prompt headings, project card, tag chips
src/sections/     whoami, projects, skills, history, contact
src/hero/         torus-knot maths, frame renderer, FPS watchdog, canvas component
src/lib/          device tier, reduced motion, plain view
src/theme/        design tokens (Tailwind 4 @theme) and base styles
e2e/              Playwright smoke tests
scripts/          build-fallback.mjs
```
