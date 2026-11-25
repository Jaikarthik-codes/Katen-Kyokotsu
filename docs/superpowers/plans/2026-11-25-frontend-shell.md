# Frontend Shell (Milestone 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A React single-page site in the ASCII-3D "printed terminal" style. It renders instantly from bundled content, swaps in live data from the Milestone 1 API, shows the live ASCII knot hero, and offers a Plain view for recruiters.

**Architecture:**
- A Vite + React 19 + TypeScript app lives in `frontend/`.
- A build script turns `seed/*.yaml` into `src/fallback/data.json`. TanStack Query hooks start from that data (`initialData`) and replace it with API responses when the API answers, so the page is never blank.
- The ASCII hero is a pure TypeScript renderer, `src/hero/knot.ts`, which turns angles into rows of characters, driven by a thin React canvas component.

**Tech Stack:**
- Node 22 and npm
- Vite 8.3 with `@vitejs/plugin-react` 6.3
- React 19.3 and TypeScript 7.0
- Tailwind 4.3 via `@tailwindcss/vite`
- TanStack Query 5.108
- `@fontsource-variable/jetbrains-mono` 5.3
- `yaml` 2.9
- Vitest 5.1 with jsdom 31 and Testing Library (`react` 16.3, `jest-dom` 8, `user-event` 14.6)
- Playwright 1.65

**Spec:** `docs/superpowers/specs/2026-11-25-portfolio-design.md`, sections "Visual direction (decided)", "Frontend" and "Architecture". The API contract is in `backend/README.md`.

**Scope ruling:** the spec puts the ASCII hero renderer in Milestone 4. This plan moves it into Milestone 2 (Task 5):
- It is the chosen signature visual.
- Its performance rules are cheapest to get right before other sections pile on.

Milestone 4 keeps the contact form flow, 404 page, accessibility audit and Lighthouse pass. Motion and Lenis are not installed until a milestone uses them.

## Global Constraints

- All frontend code lives in `frontend/`. Content comes only from `seed/*.yaml` (bundled) or the API, and no profile text is hard-coded in components.
- Design tokens, exactly:
  - paper `#ece6d8` (background)
  - ink `#141414`
  - signal red `#d4361b` (only for the brightest ASCII characters, primary actions and focus)
  - muted `#5b574f`
  - rule `#c9c1b0`
- Type: JetBrains Mono everywhere (self-hosted via `@fontsource-variable/jetbrains-mono`). Weight 800 for display, 400/600 for body; body is 16–17px.
- No gradients and no shadows. Use 2px ink borders, plus box-drawing characters (`┌─┐│└┘`) for frames and dividers.
- Section headers read like shell prompts: `$ whoami`, `$ ls projects/`, `$ cat skills.txt`, `$ history`, `$ contact`.
- The API base URL is `import.meta.env.VITE_API_URL`, default `http://localhost:8000`. Every request has a 4-second timeout.
- Accessibility:
  - exactly one `<h1>`;
  - a skip link to `#main`;
  - real landmarks;
  - visible focus (2px red outline);
  - AA contrast;
  - decorative canvases are `aria-hidden` and have a text alternative nearby;
  - `prefers-reduced-motion` is respected everywhere.
- Hero performance:
  - Pause the render when it's off screen.
  - Cap the pixel ratio at 2.
  - Use about 19,200 points (U=640 × V=30), or about 8,000 on low-tier devices (U=400 × V=20).
  - Halve the points when the frame rate stays under 45 fps for 2 seconds.
  - Reduced motion draws one static frame.
  - The ramp is ` .,-~:;=!*#$@`, and the two brightest levels are drawn in red.
- Low tier means `navigator.connection.saveData`, or `deviceMemory < 4`, or `hardwareConcurrency < 4`.
- TypeScript runs in `strict` mode with no `any`. `npm run check` (that is, `tsc --noEmit` plus `vitest run`) must pass at the end of every task.

## Review Focus

- **API down or cold (free-tier wake-up of 30 s or more):**
  - Bundled content shows immediately.
  - The header reads `○ offline copy`.
  - Nothing spins forever.
  - When the API comes back, the live data replaces the copy.
  - Test in Task 3.
- **Missing optional fields:** projects with `repo_url: null`, `live_url: null`, `started_on: null` or an empty `stack`. Cards never print "null" or "undefined", and never render a dead link. Test in Task 4.
- **Long words at phone width:** a long project name, summary or tag at 360px wraps without sideways page scroll. Test in Task 7 (e2e at iPhone width).
- **Reduced motion or a low-tier device:** no animation loop. Reduced motion draws one static frame; low tier draws the smaller knot. Test in Task 5.
- **`localStorage` throws** (Safari private mode, blocked storage): the Plain view toggle still works for the session and nothing crashes. Test in Task 6.

---

### Task 1: Scaffold, tokens, fonts and the app shell

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/.env.example`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/theme/tokens.css`
- Create: `frontend/src/test/setup.ts`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces:
  - npm scripts:
    - `dev`
    - `build` (`tsc --noEmit && vite build`)
    - `preview`
    - `test` (`vitest run`)
    - `check` (`tsc --noEmit && vitest run`)
    - `e2e` (`playwright test`)
  - `App(): JSX.Element` renders:
    - a skip link `<a href="#main">Skip to content</a>`;
    - `<header>`;
    - `<main id="main">` containing 5 `<section>`s with ids `whoami`, `projects`, `skills`, `history`, `contact`, each headed by its prompt (`$ whoami`, …);
    - `<footer>`.
  - `tokens.css` defines a Tailwind 4 `@theme` with:
    - `--color-paper`, `--color-ink`, `--color-signal`, `--color-muted`, `--color-rule`;
    - `--font-mono: "JetBrains Mono Variable", ui-monospace, monospace`;
    - base styles: body background paper, colour ink, 16px mono; `:focus-visible { outline: 2px solid var(--color-signal); outline-offset: 2px }`.

- [ ] **Step 1: Create `package.json`** with the versions from Tech Stack, plus `@types/react` 19.3 and `@types/react-dom` 19.3. Then run `npm install`.
  - Vitest config goes in `vite.config.ts`: `test: { environment: "jsdom", setupFiles: ["src/test/setup.ts"] }`.
  - The setup file imports `@testing-library/jest-dom/vitest`.

- [ ] **Step 2: Write the failing test**

```tsx
// src/App.test.tsx
it("renders the shell with a skip link and the five prompt sections", () => {
  render(<App />);
  expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
  for (const prompt of ["$ whoami", "$ ls projects/", "$ cat skills.txt", "$ history", "$ contact"]) {
    expect(screen.getByRole("heading", { name: prompt })).toBeInTheDocument();
  }
  expect(document.querySelector("main#main")).not.toBeNull();
});
```

The `$ whoami` heading is a visible `<p>` prompt, not a heading element. Mark it `role="heading" aria-level={2}` so the only `<h1>` stays the person's name, which Task 4 adds.

- [ ] **Step 3: Run it to confirm it fails.** `npm test` → FAIL (no `App`).
- [ ] **Step 4: Implement the shell.** `index.html` sets `<html lang="en">`, a viewport meta, `<title>` and `<meta name="description">`. `main.tsx` imports the font package and `tokens.css`.
- [ ] **Step 5: Run `npm run check` and `npm run build`.** Expected: tests pass, typecheck clean, build succeeds.
- [ ] **Step 6: Commit**

```bash
git add frontend && git commit -m "feat(frontend): scaffold vite react app with tokens and prompt-section shell"
```

---

### Task 2: Bundled content pipeline (`seed` → `fallback`)

**Files:**
- Create: `seed/profile.yaml`
- Create: `frontend/scripts/build-fallback.mjs`
- Create: `frontend/src/api/types.ts`
- Create: `frontend/src/fallback/index.ts`
- Modify: `frontend/package.json`:
  - `"fallback": "node scripts/build-fallback.mjs"`;
  - `predev`, `prebuild` and `pretest` run it;
  - `src/fallback/data.json` is git-ignored.
- Test: `frontend/src/fallback/fallback.test.ts`

**Interfaces:**
- Produces (in `src/api/types.ts`, mirroring `backend/app/schemas.py` exactly):
  - `type ProjectStatus = "live" | "wip" | "archived"`
  - `interface Project { slug: string; name: string; summary: string; stack: string[]; status: ProjectStatus; repo_url: string | null; live_url: string | null; started_on: string | null; featured: boolean }`
  - `interface ProjectDetail extends Project { body_md: string }`
  - `interface ProjectList { rows: Project[]; count: number; elapsed_ms: number }`
  - `interface Tag { label: string; count: number }`
  - `interface Skill { name: string; category: string; years: number | null }`
  - `interface Experience { kind: "education" | "work" | "training"; org: string; title: string; start: string; end: string | null; highlights: string[] }`
  - `interface Profile { name: string; headline: string; intro: string; email: string; github: string | null; linkedin: string | null; resume_url: string | null }`
  - `interface FallbackData { profile: Profile; projects: Project[]; details: Record<string, string>; skills: Skill[]; experience: Experience[] }`. `details` maps a slug to its `body_md`; only non-empty bodies are included.
- Produces (in `src/fallback/index.ts`):
  - `fallback: FallbackData` (imported from `data.json`)
  - `filterProjects(projects: Project[], tags: string[]): ProjectList`:
    - trims and de-duplicates tags case-insensitively;
    - AND filter, case-insensitive;
    - same order as the API (`featured` desc, then seed order);
    - `elapsed_ms: 0`.
  - `tagCounts(projects: Project[]): Tag[]`: sorted by count desc, then label asc (same as the API).
- `build-fallback.mjs`:
  - reads `../seed/{profile,projects,skills,experience}.yaml`;
  - fills API defaults (`stack: []`, `featured: false`, nulls for missing optionals);
  - moves each non-empty `body_md` into `details`;
  - sorts skills and experience the way the API does;
  - writes `src/fallback/data.json`;
  - exits non-zero with a clear message if any file is missing.

- [ ] **Step 1: Write the failing tests**

```ts
const P = (slug: string, stack: string[], featured = false) =>
  ({ slug, name: slug, summary: "s", stack, status: "wip", repo_url: null, live_url: null, started_on: null, featured }) as Project;
const projects = [P("a", ["FastAPI", "PostgreSQL"], true), P("b", ["FastAPI", "React"]), P("c", ["Python"])];

it("filters with AND, ignoring case, whitespace and duplicates", () => {
  expect(filterProjects(projects, [" fastapi ", "FASTAPI", "react"]).rows.map((p) => p.slug)).toEqual(["b"]);
});
it("returns everything for no tags", () => {
  expect(filterProjects(projects, []).count).toBe(3);
});
it("counts tags like the API", () => {
  expect(tagCounts(projects)[0]).toEqual({ label: "FastAPI", count: 2 });
});
it("bundles real seed content", () => {
  expect(fallback.profile.name.length).toBeGreaterThan(0);
  expect(fallback.projects.some((p) => p.slug === "portfolio")).toBe(true);
});
```

- [ ] **Step 2: Run them to confirm they fail.**

- [ ] **Step 3: Create `seed/profile.yaml`** with these keys:
  - `name: "Your Name (placeholder)"`
  - `headline: "Backend engineer"`
  - `intro`: one sentence about building APIs, databases and AI features with Python, FastAPI and PostgreSQL
  - `email: "you@example.com"`
  - `github: null`, `linkedin: null`, `resume_url: null`

  Then implement the script and functions.

- [ ] **Step 4: Run `npm run check`.** Expected: all pass.
- [ ] **Step 5: Commit**

```bash
git add seed/profile.yaml frontend && git commit -m "feat(frontend): bundle seed content as fallback data with API-equivalent filters"
```

---

### Task 3: API client, query hooks and connection status

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/hooks.ts`
- Create: `frontend/src/api/QueryProvider.tsx`
- Modify: `frontend/src/main.tsx` (wrap `App`)
- Test: `frontend/src/api/api.test.tsx`

**Interfaces:**
- Consumes: Task 2 types, `fallback`, `filterProjects`, `tagCounts`.
- Produces:
  - `class ApiError extends Error { status: number; code: string }`
  - `apiGet<T>(path: string, params?: Record<string, string | string[]>): Promise<T>`:
    - URL is `${API_BASE}${path}`, with repeated params for arrays;
    - `AbortSignal.timeout(4000)`;
    - on a non-OK response, throws `ApiError` with `code` read from the `{error: {code}}` envelope, or `"http_error"`.
  - `type Source = "live" | "cached"`
  - Hooks, each returning `{ data: T; source: Source }` and always defined:
    - `useProjects(tags: string[])`, with T = `ProjectList`;
    - `useTags()`, with T = `Tag[]`;
    - `useSkills()`, with T = `Skill[]`;
    - `useExperience()`, with T = `Experience[]`.
    - `useProject(slug: string, enabled: boolean)`, with T = `ProjectDetail | undefined`. Its initial data is built from the fallback row plus `details[slug]`.
    - Each uses `initialData` from the fallback and `initialDataUpdatedAt: 0`, so it fetches immediately.
    - `source` is `"cached"` until the first successful fetch.
    - `retry: 1`, `staleTime: 60_000`.
  - `useApiStatus(): "online" | "offline" | "checking"`, which polls `/healthz` every 30 s.
  - `QueryProvider({ children })`.
  - The test helper `renderWithQuery(ui)` lives in `src/test/render.tsx`, using a fresh client with `retry: false`.

- [ ] **Step 1: Write the failing tests** (stub `fetch` with `vi.stubGlobal`)

```tsx
it("shows cached data first, then live data", async () => {
  const live = { rows: [{ ...fallback.projects[0], name: "Live name" }], count: 1, elapsed_ms: 3.2 };
  let resolve!: (r: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((r) => (resolve = r))));
  const { result } = renderHookWithQuery(() => useProjects([]));
  expect(result.current.source).toBe("cached");
  expect(result.current.data.count).toBe(fallback.projects.length);
  resolve(new Response(JSON.stringify(live), { status: 200 }));
  await waitFor(() => expect(result.current.source).toBe("live"));
  expect(result.current.data.rows[0].name).toBe("Live name");
});

it("keeps cached data and reports offline when the API is down", async () => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
  const { result } = renderHookWithQuery(() => ({ p: useProjects([]), s: useApiStatus() }));
  await waitFor(() => expect(result.current.s).toBe("offline"));
  expect(result.current.p.source).toBe("cached");
  expect(result.current.p.data.rows.length).toBeGreaterThan(0);
});

it("sends repeated tag params and surfaces the envelope code", async () => {
  const f = vi.fn(async () => new Response(JSON.stringify({ error: { code: "unknown_tag", message: "Unknown tag", details: [] } }), { status: 422 }));
  vi.stubGlobal("fetch", f);
  await expect(apiGet("/api/v1/projects", { tag: ["FastAPI", "React"] })).rejects.toMatchObject({ status: 422, code: "unknown_tag" });
  expect(String(f.mock.calls[0][0])).toContain("tag=FastAPI&tag=React");
});
```

`renderHookWithQuery` is `renderHook` wrapped in the Task 3 test helper's provider.

- [ ] **Step 2: Run them to confirm they fail.** **Step 3: Implement.** **Step 4: Run `npm run check`.** Expected: all pass.
- [ ] **Step 5: Commit**

```bash
git add frontend && git commit -m "feat(frontend): add api client and query hooks with cached-first data"
```

---

### Task 4: Content sections (whoami, projects, skills, history, contact)

**Files:**
- Create: `frontend/src/sections/Whoami.tsx`
- Create: `frontend/src/sections/Projects.tsx`
- Create: `frontend/src/sections/Skills.tsx`
- Create: `frontend/src/sections/History.tsx`
- Create: `frontend/src/sections/Contact.tsx`
- Create: `frontend/src/components/Prompt.tsx`
- Create: `frontend/src/components/Header.tsx`
- Create: `frontend/src/components/ProjectCard.tsx`
- Create: `frontend/src/components/TagChips.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/sections/sections.test.tsx`

**Interfaces:**
- Consumes: Task 3 hooks, `fallback.profile`.
- Produces these components and behaviour:
  - `Prompt({ command, id })`: the `$ command` heading, as `role="heading" aria-level={2}`.
  - `Header()` shows:
    - the profile name;
    - nav links to the 5 section ids;
    - the status `● online` or `○ offline copy` from `useApiStatus`;
    - a Plain view slot (filled in Task 6).
  - `Whoami`:
    - the `<h1>` is the profile name, at display weight 800;
    - then the headline and intro;
    - CTAs "See projects" (`#projects`) and "Resume", shown only if `resume_url` is set;
    - a hero art slot for Task 5.
  - `Projects`:
    - `TagChips` from `useTags()` toggle selected tags (`aria-pressed`) and feed `useProjects(selected)`;
    - a status line `(n rows) · 3.2 ms`, or `(n rows) · offline copy` when `source === "cached"`;
    - a grid of `ProjectCard`s.
  - `ProjectCard`:
    - a 2px ink border with a box-drawing title row `├─ <name>`;
    - summary, stack, and a status badge;
    - links rendered only when the URL is non-null, opening in a new tab with `rel="noopener noreferrer"`;
    - `started_on` shown as the year only when present;
    - a `Details` disclosure button (`aria-expanded`), shown only when `fallback.details[slug]` exists. Expanding it calls `useProject(slug, true)` and renders `body_md` as plain text with `white-space: pre-wrap`; no Markdown renderer until a milestone needs one.
  - `Skills`: a table grouped by category (the API order is kept). Years are shown only when non-null.
  - `History`: a list, newest first, showing `start–end` as years (`present` when `end` is null) and highlights.
  - `Contact`:
    - the email as a `mailto:` link plus the address as visible text;
    - GitHub and LinkedIn when present.
    - Only working channels are listed. There's no "coming soon" text; the form arrives in Milestone 4.

- [ ] **Step 1: Write the failing tests**

```tsx
it("filters projects when a tag chip is pressed", async () => {
  stubFetchRouter({ "/api/v1/tags": [{ label: "FastAPI", count: 1 }], "/api/v1/projects": (url) => projectsFor(url) });
  renderWithQuery(<Projects />);
  await userEvent.click(await screen.findByRole("button", { name: "FastAPI" }));
  expect(screen.getByRole("button", { name: "FastAPI" })).toHaveAttribute("aria-pressed", "true");
  await waitFor(() => expect(lastFetchUrl()).toContain("tag=FastAPI"));
});

it("never prints null or dead links for missing optionals", () => {
  const p = { ...fallback.projects[0], repo_url: null, live_url: null, started_on: null, stack: [] };
  render(<ProjectCard project={p} />);
  expect(document.body.textContent).not.toMatch(/null|undefined/);
  expect(screen.queryByRole("link")).toBeNull();
});

it("expands project details only when a write-up exists", async () => {
  const p = { ...fallback.projects[0], slug: "with-notes" };
  setFallbackDetails({ "with-notes": "Line one\nLine two" });
  renderWithQuery(<ProjectCard project={p} />);
  await userEvent.click(screen.getByRole("button", { name: "Details" }));
  expect(screen.getByText(/Line one/)).toBeInTheDocument();
});

it("shows offline copy in the status line when cached", () => {
  stubFetchRouter({}); // every request rejects
  renderWithQuery(<Projects />);
  expect(screen.getByText(/offline copy/)).toBeInTheDocument();
});

it("renders the profile name as the only h1", () => {
  renderWithQuery(<App />);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
});
```

The helpers `stubFetchRouter(routes)` and `lastFetchUrl()` go in `src/test/fetch.ts`, and unknown paths reject. `setFallbackDetails(map)` temporarily replaces `fallback.details` and is restored in `afterEach`.

- [ ] **Step 2: Run them to confirm they fail.** **Step 3: Implement.**
  - Layout follows the gallery style 18:
    - Desktop: copy on the left (about 45%) and the hero art slot on the right in `Whoami`.
    - Below 760px: everything stacks, with the art first.
    - The project grid is `repeat(auto-fit, minmax(min(100%, 300px), 1fr))`.
    - Long words wrap with `overflow-wrap: anywhere`.
- [ ] **Step 4: Run `npm run check`.** Expected: all pass.
- [ ] **Step 5: Commit**

```bash
git add frontend && git commit -m "feat(frontend): add whoami, projects, skills, history and contact sections"
```

---

### Task 5: ASCII knot hero

**Files:**
- Create: `frontend/src/hero/knot.ts`
- Create: `frontend/src/hero/watchdog.ts`
- Create: `frontend/src/lib/device.ts`
- Create: `frontend/src/hero/AsciiHero.tsx`
- Modify: `frontend/src/sections/Whoami.tsx` (fill the art slot)
- Test: `frontend/src/hero/knot.test.ts`
- Test: `frontend/src/hero/watchdog.test.ts`
- Test: `frontend/src/lib/device.test.ts`
- Test: `frontend/src/hero/AsciiHero.test.tsx`

**Interfaces:**
- Produces:
  - `RAMP = " .,-~:;=!*#$@"`.
  - `buildKnot(u: number, v: number): { points: Float32Array; normals: Float32Array }`:
    - a (2,3) torus knot;
    - curve `C(t) = ((cos3t+2)cos2t, (cos3t+2)sin2t, −1.2 sin3t)`;
    - tube radius 0.5;
    - frame from the tangent crossed with `(0,0,1)`.
  - `renderFrame(knot, a: number, b: number, cols: number, rows: number, cellAspect: number): { text: string[]; hot: string[] }`:
    - rotate about X by `a`, then Z by `b`;
    - perspective `K2 = 9`;
    - z-buffer per cell;
    - light `(−0.42, 0.62, −0.66)`;
    - `text` holds the rows with the top 2 ramp levels blanked;
    - `hot` holds only those levels, so they can be drawn in red.
  - `createWatchdog({ minFps: 45, windowMs: 2000, onSlow }): { tick(now: number): void }`. `onSlow` fires at most once.
  - `deviceTier(nav?: Partial<Navigator & { deviceMemory: number; connection: { saveData: boolean } }>): "low" | "high"`.
  - `prefersReducedMotion(): boolean`.
  - `AsciiHero()`:
    - `<canvas aria-hidden>` plus a visually hidden text "Rotating 3D knot drawn in text characters";
    - `IntersectionObserver` pause;
    - pixel ratio `min(devicePixelRatio, 2)`;
    - samples U=640,V=30 on high tier and U=400,V=20 on low tier, with the current U×V exposed as `data-samples` on the canvas;
    - the watchdog halves V on slow devices;
    - pointer drag adds rotation offsets;
    - reduced motion draws one frame and starts no `requestAnimationFrame` loop.

- [ ] **Step 1: Write the failing tests**

```ts
it("renders a frame of the right size with content near the centre", () => {
  const f = renderFrame(buildKnot(320, 16), 0.6, 0, 80, 40, 2);
  expect(f.text).toHaveLength(40);
  expect(f.text.every((r) => r.length === 80)).toBe(true);
  const filled = f.text.flatMap((r, y) => [...r].map((c, x) => (c !== " " ? [x, y] : null))).filter(Boolean) as number[][];
  expect(filled.length).toBeGreaterThan(300);
  const cx = filled.reduce((s, p) => s + p[0], 0) / filled.length;
  expect(Math.abs(cx - 40)).toBeLessThan(8);
});
it("puts only the two brightest ramp characters in hot", () => {
  const f = renderFrame(buildKnot(320, 16), 0.6, 0, 80, 40, 2);
  expect(f.hot.join("").replace(/[ ]/g, "")).toMatch(/^[$@]*$/);
  expect(f.text.join("")).not.toMatch(/[$@]/);
});
it("fires onSlow once when fps stays under 45 for 2s", () => {
  const onSlow = vi.fn(); const w = createWatchdog({ minFps: 45, windowMs: 2000, onSlow });
  for (let t = 0; t <= 4000; t += 50) w.tick(t); // 20 fps
  expect(onSlow).toHaveBeenCalledTimes(1);
});
it("does not fire at 60fps", () => {
  const onSlow = vi.fn(); const w = createWatchdog({ minFps: 45, windowMs: 2000, onSlow });
  for (let t = 0; t <= 4000; t += 16.7) w.tick(t);
  expect(onSlow).not.toHaveBeenCalled();
});
it.each([[{ hardwareConcurrency: 2 }, "low"], [{ deviceMemory: 2, hardwareConcurrency: 8 }, "low"], [{ connection: { saveData: true }, hardwareConcurrency: 8 }, "low"], [{ hardwareConcurrency: 8, deviceMemory: 8 }, "high"]])("tier %o", (nav, tier) => {
  expect(deviceTier(nav as never)).toBe(tier);
});
it("uses the small knot on low-tier devices", () => {
  vi.spyOn(navigator, "hardwareConcurrency", "get").mockReturnValue(2);
  render(<AsciiHero />);
  expect(document.querySelector("canvas")).toHaveAttribute("data-samples", "8000");
});

it("draws one static frame and starts no loop under reduced motion", () => {
  mockMatchMedia({ "(prefers-reduced-motion: reduce)": true });
  const raf = vi.spyOn(window, "requestAnimationFrame");
  render(<AsciiHero />);
  expect(raf).not.toHaveBeenCalled();
  expect(canvasFillTextCalls()).toBeGreaterThan(0);
});
```

`mockMatchMedia` and `canvasFillTextCalls` are test helpers in `src/test/canvas.ts`. jsdom has no 2D context, so `HTMLCanvasElement.prototype.getContext` is stubbed with a recorder.

- [ ] **Step 2: Run them to confirm they fail.** **Step 3: Implement.** Font sizes: 11px for cells on screens ≥ 520px wide, 9px below. Cell size is measured with `measureText("M")`.
- [ ] **Step 4: Run `npm run check`.** Expected: all pass.
- [ ] **Step 5: Commit**

```bash
git add frontend && git commit -m "feat(frontend): add adaptive ascii knot hero"
```

---

### Task 6: Plain view

**Files:**
- Create: `frontend/src/lib/plainView.ts`
- Modify: `frontend/src/components/Header.tsx` (toggle button)
- Modify: `frontend/src/sections/Whoami.tsx` (no hero in plain view)
- Modify: `frontend/src/theme/tokens.css` (`[data-view="plain"]` rules)
- Test: `frontend/src/lib/plainView.test.tsx`

**Interfaces:**
- Produces: `usePlainView(): [plain: boolean, toggle: () => void]`.
  - It mirrors the state to `document.documentElement.dataset.view = "plain" | "full"`.
  - It persists to `localStorage["plain-view"]`, with every access wrapped in try/catch.
  - The initial state comes from storage, falling back to `false`.
- Header button: text `Plain view` / `Full view`, `aria-pressed`.
- In plain view:
  - the hero art is not mounted;
  - decorative box-drawing rows are hidden;
  - the layout is single-column;
  - all animation is off.

- [ ] **Step 1: Write the failing tests**

```tsx
it("toggles plain view, unmounts the hero and persists", async () => {
  renderWithQuery(<App />);
  await userEvent.click(screen.getByRole("button", { name: "Plain view" }));
  expect(document.documentElement.dataset.view).toBe("plain");
  expect(document.querySelector("canvas")).toBeNull();
  expect(localStorage.getItem("plain-view")).toBe("1");
});
it("still works when localStorage throws", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  renderWithQuery(<App />);
  await userEvent.click(screen.getByRole("button", { name: "Plain view" }));
  expect(document.documentElement.dataset.view).toBe("plain");
});
```

- [ ] **Step 2: Run them to confirm they fail.** **Step 3: Implement.** **Step 4: Run `npm run check`.** Expected: all pass.
- [ ] **Step 5: Commit**

```bash
git add frontend && git commit -m "feat(frontend): add plain view toggle for recruiters"
```

---

### Task 7: End-to-end smoke, screenshots and README

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/smoke.spec.ts`
- Create: `frontend/README.md`
- Modify: `backend/.env.example` (add `http://localhost:4173` to `CORS_ORIGINS` for `vite preview`)

**Interfaces:**
- Consumes everything above, plus a running backend at `VITE_API_URL`.
- `playwright.config.ts`:
  - `webServer` runs `npm run build && npm run preview -- --port 4173`;
  - projects `desktop` (1440×900) and `iphone` (`devices["iPhone 13"]`);
  - `trace: "off"`.

- [ ] **Step 1: Write the e2e tests**

```ts
test("live data, tag filter and hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("● online")).toBeVisible();
  await expect(page.getByText(/rows\) · [\d.]+ ms/)).toBeVisible();
  await page.getByRole("button", { name: "FastAPI" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
test("offline copy when the API is unreachable", async ({ page }) => {
  await page.route("**/api/v1/**", (r) => r.abort());
  await page.route("**/healthz", (r) => r.abort());
  await page.goto("/");
  await expect(page.getByText("○ offline copy")).toBeVisible();
  await expect(page.getByRole("article").first()).toBeVisible();
});

test("long names and tags wrap at phone width", async ({ page }) => {
  const long = "Supercalifragilisticexpialidocious-distributed-event-sourcing-pipeline";
  await page.route("**/api/v1/projects*", (r) => r.fulfill({ json: { rows: [{ slug: "x", name: long, summary: long + " " + long, stack: [long], status: "wip", repo_url: null, live_url: null, started_on: null, featured: false }], count: 1, elapsed_ms: 1 } }));
  await page.goto("/");
  await expect(page.getByText(long).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
```

The "1 article" expectation holds for the real seed, where only `portfolio` has FastAPI.

- [ ] **Step 2: Run against the live stack:**
  - backend `uvicorn` on :8000, with the seeded dev DB and `CORS_ORIGINS` including `:4173`;
  - then `npm run e2e -- --trace off`.

  Expected: 6 passed (3 tests × 2 projects).
- [ ] **Step 3: Take screenshots** of the desktop and iPhone first screen and the projects section into the scratchpad, and look at them. Fix any layout breakage, test-first if it is behavioural.
- [ ] **Step 4: Write `frontend/README.md`:**
  - setup;
  - env (`VITE_API_URL`);
  - scripts;
  - how the fallback works;
  - Plain view;
  - hero performance rules.

  Then run `npm run check && npm run build` one last time.
- [ ] **Step 5: Commit**

```bash
git add frontend backend/.env.example && git commit -m "test(frontend): add e2e smoke, screenshots check and README"
```
