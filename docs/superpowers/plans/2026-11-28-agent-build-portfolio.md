# Agent-build portfolio: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fast, static portfolio for Jai Karthik (Python backend + AI roles). When the page loads, coloured cursor "agents" build it piece by piece.

**Architecture:**

- A static page written in plain HTML.
- A framework-free TypeScript engine that hides the page, measures it in small time slices, and runs a job queue. Each agent pulls jobs from the queue, and an element's job waits until its parent's job is done.
- One `requestAnimationFrame` clock drives cursors, reveals, auto-scroll and the status bar (HUD).
- A tiny inline gate in `<head>` decides before first paint whether the intro runs. A CSS failsafe makes sure the page can never stay hidden.

**Tech stack:** Vite 8.4, TypeScript 6.0.3 (typescript-eslint needs <6.1), Vitest 5.1 + jsdom 31, Playwright 1.63.0 (pinned to the browser installed here), ESLint 10 + typescript-eslint 8.74, Prettier 3.10, `@fontsource` IBM Plex Sans and Mono.

**Spec:**

- `docs/reference/fahimweb-report.md` (the user's report).
- The decisions below, which the user delegated ("start new, use only the report and my input").

## Global constraints

- No code or design from the old commits. Only the report and the user's input.
- Visual rules:
  - Flat look: no gradients and no box-shadows. Paper-and-ink palette; the agents are the only bright colours. IBM Plex Sans for the page, IBM Plex Mono for labels and the HUD.
  - Animate only `transform`, `opacity` and `clip-path`. Frame width and height are written only when the rounded value changes.
- Values from the report, used exactly:
  - Scan 1.7 s, started after `document.fonts.ready` (or 1.5 s at most).
  - Dispatcher every 70 ms. Dispatch window: top 86 % of the viewport, at most 260 layers per pass.
  - Agents: desktop 18→30, touch 8→14, growing linearly with progress. Target length: desktop 44 s, touch 26 s, measured at 553 layers.
  - Text reveal `clamp(0.24 + 0.014·chars, 0.3, 1.5)` s. Icon reveal 0.16 s.
  - Easing `1 − e^(−k·dt)`, with k = 15 on a job and 3.2 when wandering. dt capped at 50 ms.
  - Auto-scroll 60–1,500 px/s. It waits the first 2.4 s and pauses while 15+ layers are pending in the window.
  - Speed buttons 1×, 2×, 4× multiply every timer. Hard cap 150 s.
- Skip triggers:
  - wheel, `touchmove`, Space, PageUp/PageDown, arrow keys, Home, End, Escape, Ctrl/Cmd+K;
  - a pointerdown on a link or button outside the HUD;
  - focus moving outside the HUD;
  - the page sitting 90+ px away from where auto-scroll put it.
- Gate:
  - The intro never runs with reduced motion, even when forced.
  - It is skipped in Plain view, with `?nobuild`, with a `#hash` deep link, when it was seen in the last 7 days (localStorage `ab:seen`), for bots and headless browsers (UA regex or `navigator.webdriver`), and on low-power devices (`saveData`, `deviceMemory < 4`, `hardwareConcurrency < 4`).
  - `?build` overrides every one of those reasons except reduced motion.
- Fixes the report asked for:
  - The scan works in time slices of ≤ 8 ms and only reads the DOM. All writes happen in one pass after the reads.
  - Positions are cached in document coordinates, with no layout reads in the dispatcher.
  - Cursor and frame nodes are created once and reused.
  - Gate, scheduler and easing have unit tests.
  - No long task over 200 ms during the intro.
- Accessibility:
  - Hidden content uses only opacity or clip-path, so screen readers can still read it.
  - The overlay is `aria-hidden`. The HUD uses real buttons.
  - A polite live region tells screen reader users how to skip.
- Ownership: all `localStorage` access goes inside try/catch.
- Hiding the page: `html[data-ab-phase]` moves through `pending → measure → scan → build`, and the attribute is removed at the end. `html[data-ab-result]` is then set to `done | skipped | error | cap`.

## Review focus

1. **The engine script fails to load or throws.** The page must become visible anyway: the CSS failsafe reveals it after 4 s, and every error path reveals all layers. Covered by e2e `failsafe reveals the page when the engine script is blocked`.
2. **A phone's address bar shows or hides.** That changes only the viewport height, and it must not skip or restart the build. A change in width skips the build. Covered by unit test `isLayoutResize ignores height-only changes`.
3. **Layers above the window never get built** because auto-scroll moved past them. The dispatcher falls back to ready layers above the window, so the build still finishes. Covered by unit test `pickWindow falls back to ready layers above the window`.
4. **Storage throws** (private mode or blocked cookies). The gate and Plain view must still work. Covered by unit tests `readEnv survives throwing storage` and `setPlain survives throwing storage`.
5. **A child element is revealed while its parent card is still hidden.** Opacity multiplies, so the child would stay invisible. The queue never starts a child before its parent is done. Covered by unit test `child becomes ready only after parent finishes`.

---

### Task 1: Scaffold and tooling

**Files:**

- `package.json`
- `tsconfig.json`
- `vite.config.ts` (with the Vitest config inside)
- `eslint.config.js`
- `.prettierrc.json`
- `.prettierignore`
- `playwright.config.ts`
- `.gitignore`
- `src/smoke.test.ts` (deleted in Task 2)

- [ ] Write `package.json` scripts:
  - `dev`, `build` (`vite build`), `preview`
  - `typecheck` (`tsc --noEmit`)
  - `lint` (`eslint .`)
  - `format` (`prettier --check .`)
  - `test` (`vitest run`)
  - `e2e` (`playwright test`)
  - `check` (runs lint, typecheck, test and build)
- [ ] Settings:
  - `tsconfig`: strict, `noUncheckedIndexedAccess`, `moduleResolution: bundler`, DOM libs, includes `src`, `tools`, `e2e` and the configs.
  - Vitest: `environment: 'jsdom'`, `include: ['src/**/*.test.ts', 'tools/**/*.test.ts']`.
  - Playwright: projects `desktop` (1440×900, Chromium) and `phone` (`devices['Pixel 7']`). `webServer` runs `npm run build && npm run preview -- --port 4173 --strictPort`.
- [ ] Run `npm run lint && npm run typecheck && npm test`. Expected: all pass, with 1 smoke test.

### Task 2: Pure engine logic (`src/agent-build/`, test first)

**Interfaces (produced):**

- `math.ts`:
  - `clamp(v, lo, hi): number`
  - `approach(cur, target, k, dt): number`
  - `capDt(ms, maxMs = 50): number`, which returns seconds
  - `easeOutCubic(t): number`
- `config.ts`: `CONFIG`, a frozen object holding every value listed in Global constraints.
- `gate.ts`: **must have zero imports**, because it is inlined into `<head>`.
  - `interface GateEnv { reducedMotion; saveData; deviceMemory: number|null; cores: number|null; userAgent; webdriver; hash; search; plainView; seenAt: number|null; now }`
  - `decide(env): { run: boolean; reason: 'reduced-motion'|'plain-view'|'opt-out'|'forced'|'deep-link'|'seen'|'bot'|'low-power'|'ok' }`
  - `readEnv(win: Window): GateEnv`
  - `runHeadGate(win = window): GateDecision`. It sets `data-view="plain"` and `data-ab-phase="pending"` on `<html>`.
  - Exports `SEEN_KEY = 'ab:seen'`, `VIEW_KEY = 'ab:view'` and `SEEN_TTL_MS`.
- `tier.ts`:
  - `interface Tier { name; agentsMin; agentsMax; targetSeconds; minSeconds; extras }`
  - `DESKTOP` = 18, 30, 44, 12, true
  - `TOUCH` = 8, 14, 26, 8, false
  - `pickTier(finePointer, canHover): Tier`
  - `agentsFor(tier, progress): number`
  - `targetSecondsFor(tier, layers): number` = `clamp(layers × target / 553, min, target)`
  - `isLayoutResize(prevW, nextW): boolean` is true when the width changed by more than 1 px.
- `lines.ts`:
  - `interface Box { x; y; w; h }`
  - `mergeLineRects(rects: Box[]): Box[]`. It groups rects whose vertical centres overlap into lines, sorted top to bottom, and drops zero-width rects.
  - `revealPolygon(lines, progress, width): string` returns a 6-point L-shaped CSS `polygon()`, or `'none'` when progress ≥ 1.
  - `penPoint(lines, progress): {x, y}` gives the vertical centre of the current line at the revealed x.
- `jobs.ts`:
  - `type LayerKind = 'text'|'box'|'media'|'icon'`
  - `jobSeconds(kind, chars, w, h)`:
    - text: report formula
    - icon: 0.16
    - box and media: `clamp(0.32 + (w + h)/3000, 0.35, 0.85)`
  - `frameAt(progress, w, h)` uses ease-out-cubic.
- `queue.ts`: `class JobQueue(parents: readonly number[])` with:
  - `size`
  - `state(id)`: one of `blocked | ready | running | done`
  - `start(id)`, which throws unless the job is ready
  - `finish(id): number[]`, the children that just became ready
  - `finishAll()`
  - `counts()`
  - `allDone`
- `dispatch.ts`:
  - `pickWindow(layers: {id,y,h}[], isReady, viewTop, viewBottom, limit): number[]` returns ready layers in the window in document order. After them come ready layers above the window, nearest first, and the result is capped at `limit`.
  - `assignNearest(jobs: Spot[], agents: Spot[]): {job, agent}[]` is greedy. Jobs are taken in the given order, and each goes to the nearest unused agent.
  - `pendingInWindow(layers, isDone, viewTop, viewBottom): number`
- `autoscroll.ts`: `scrollVelocity({elapsed, target, scrollY, maxScroll, pendingInView}): number`, in px/s.

**Tests (each written first and seen failing):**

- `approach is frame-rate independent`: two 8 ms steps ≈ one 16 ms step, to within 1e-9.
- `capDt caps at 50 ms`
- `decide` order and `?build` override (one `it` per reason).
- `readEnv survives throwing storage`
- `agentsFor grows linearly 18→30`
- `targetSecondsFor scales and clamps`
- `isLayoutResize ignores height-only changes`
- `mergeLineRects` cases:
  - one line
  - inline spans merged
  - two lines
  - baseline offset merged
  - zero-width dropped
- `revealPolygon` at 0, mid-second-line and 1.
- `textSeconds` clamp values: 0 chars → 0.3, 10 → 0.38, 200 → 1.5.
- `child becomes ready only after parent finishes`
- `pickWindow respects 86 % window and 260 limit`
- `pickWindow falls back to ready layers above the window`
- `assignNearest picks nearest free agent`
- `scrollVelocity` waits for 2.4 s, pauses at 15 pending, clamps to 60–1500, and returns 0 at the bottom.

- [ ] Write the tests, run them and see them fail, implement, run them and see them pass, then commit `feat(engine): pure scheduling, gate and easing logic`.

### Task 3: Static page, styles and Plain view

**Files:**

- `index.html`
- `public/favicon.svg`
- `src/main.ts`
- `src/styles/{tokens,base,site,plain,intro}.css`
- `src/plain-view.ts` and its test

- [ ] **Content:**
  - The header has the name, nav, a Plain view toggle (`#plain-toggle`, with `aria-pressed`) and a Resume link.
  - The hero has an h1 "Jai Karthik", a lead line, and CTAs for projects, resume and GitHub. It also has a `GET /api/v1/me` JSON card: a `pre` that gets typed out line by line.
  - Then the Projects, Skills, Experience and Contact sections, and the footer with `#replay` and credits.
  - Everything sits inside `<div id="app">`. Placeholder content is marked `TODO(content)`.
  - Cards, chips and buttons carry `data-ab="box"`.
- [ ] **`plain-view.ts`:**
  - `isPlain(doc)`
  - `setPlain(doc, storage, on)` uses `VIEW_KEY`.
  - `bindPlainToggle(button, doc, storage, onChange?)`
  - Tests: `setPlain survives throwing storage`, and that the toggle flips `aria-pressed`.
- [ ] Run `npm run check`, then commit `feat(site): static page, flat theme and plain view`.

### Task 4: DOM engine

**Interfaces:**

- `layers.ts`: `collectCandidates(root): Candidate[]`, where `Candidate { el; kind: LayerKind; parent: number }`.
  - Skip `[data-ab-skip]` with its subtree, and `script`, `style`, `noscript` and `template`.
  - An explicit `data-ab` hint wins.
  - The text tags `H1–H6, P, LI, DT, DD, BLOCKQUOTE, FIGCAPTION, LABEL, TD, TH, PRE, SUMMARY` and a bare `A` become text, unless they contain another text tag or media. Then they are containers.
  - `IMG, SVG, CANVAS, VIDEO, PICTURE` become media.
  - Only boxes are descended into and become parents.
- `scan.ts`: `measureLayers(cands, {budgetMs, now, yieldToMain, scrollX, scrollY, iconMaxSize}): Promise<Layer[]>`, where `Layer { id; el; kind; parent; x; y; w; h; lines; chars; label }`.
  - It only reads the DOM, and yields when `now() − sliceStart ≥ budgetMs`.
  - Zero-size candidates are dropped, and parents are remapped.
  - Media of 40 px or less becomes an icon.
- `agents.ts`: `AgentPool(parent, max)` with `activate(count, x, y)`, `step(dt, kFor)`, `render()` and `destroy()`.
  - It writes `translate3d` only when the position changes by 0.1 px or more.
  - `data-tool` is one of `pointer | crosshair | text`.
- `frames.ts`: `FramePool(parent, max)` with `acquire(color)`, `place(i, x, y, w, h)`, `release(i)` and `destroy()`. It shows a `W × H` label. On desktop, CSS guides use `::before` and `::after`.
- `hud.ts`:
  - `Hud(doc, {onSpeed, onSkip}, extras)` with `update(stats)`, `log(line)`, `announce(msg)`, `toast(text, onReplay)` and `destroy()`.
  - Counters use `textContent`, written only when they change.
- `input.ts`:
  - `isSkipKey({key, ctrlKey, metaKey}): boolean`, unit-tested.
  - `watchSkipTriggers(win, insideEls, onSkip): () => void`
- `engine.ts`:
  - `startBuild({force?}): Promise<BuildResult>`
  - `skipBuild()`
  - `isBuilding()`
  - Phases follow Global constraints. One rAF loop does the work in this order: dt → dispatch every 0.07 s (scaled) → jobs → agents → auto-scroll → HUD → end check. The work runs inside try/catch, and an error reveals everything.
- `tools/head-gate-plugin.ts`:
  - `headGateScript(source): string` strips the `export` keywords and wraps the code in an IIFE that calls `runHeadGate()`.
  - `headGate(): Plugin` injects that script into `<head>` in dev and in the build.
  - Test: `head gate script sets pending phase` runs the output against a jsdom window.
- [ ] Unit tests: `collectCandidates classifies and nests`, `measureLayers yields between slices`, `isSkipKey`, and the head-gate script test.
- [ ] Wire it up in `main.ts`: start the build if the phase is `pending`, and `#replay` calls `startBuild({force: true})`. Run `npm run check`, then commit.

### Task 5: Browser tests and performance

**Files:**

- `e2e/intro.spec.ts`
- `e2e/site.spec.ts`

- [ ] `intro.spec.ts`:
  - `?build` starts the overlay with 18 agents on desktop and 8 on the phone.
  - Layers flip to `on`.
  - Skip and Escape end it with `data-ab-result="skipped"`.
  - At 4×, it finishes with `done`.
  - Reduced motion plus `?build` never starts it.
  - A default headless visit never starts it.
  - `#projects` never starts it.
  - `failsafe reveals the page when the engine script is blocked`
  - No long task over 200 ms during the first 6 s of `?build` (desktop).
- [ ] `site.spec.ts`:
  - Plain view toggles and persists.
  - There is one h1, a skip link and no console errors.
- [ ] Run `npm run e2e`. Expected: all pass on desktop and phone. Take screenshots (1×) during the build and after it, and review them.

### Task 6: README, CI and push

- [ ] `README.md` covers what the site is, how the intro works, the stack and why, scripts, structure, the content TODO list, deployment to any static host, and credits for the inspiration (a clean-room rebuild).
- [ ] `.github/workflows/ci.yml`: Node 22, `npm ci`, lint, typecheck, test, build, Playwright Chromium install, then e2e.
- [ ] Run `npm run check && npm run e2e`, commit, and push `main`.
