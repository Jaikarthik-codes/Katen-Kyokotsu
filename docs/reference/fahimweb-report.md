# Reverse-engineering report: project.fahimweb.online

Nov 27, 2026 · @Jai Karthik

## Summary

The "agent build" intro on [project.fahimweb.online](https://project.fahimweb.online/) is not AI. It is a job scheduler in the browser that moves fake cursors over the page and reveals each part as a cursor "builds" it. It stays smooth because one clock drives every animation, motion is time-based, and weaker devices get less work.

- **Stack:** React built with Vite, GSAP 3.12.5 with ScrollTrigger, Lenis 1.1.16 for smooth scrolling, framer-motion 11.11.17, and Three.js r169 through React Three Fiber for the 3D hero.
- **The intro:** it scans the page into 553 "layers" on desktop. Every 70 ms a dispatcher hands each unbuilt layer on screen to the nearest free cursor.
- **Smoothness:** one `gsap.ticker` drives scrolling, scroll effects and the intro. Easing uses 1 − e^(−k·dt) with dt capped at 50 ms. Only transform, clip-path and opacity animate.
- **Device tiers:** desktops run 18 to 30 agents, phones 8 to 14. Reduced motion, weak devices, bots, deep links and repeat visits skip the intro entirely.
- **Weak spot:** one 707 ms freeze on desktop, most likely the one-time scan that measures about 553 elements at once.

## How it was analysed

Everything comes from the outside, on 2026-11-24: the files the site ships to every visitor, never private source code.

1. **Bundle analysis with REA** (`rea-agents` 6.10.1, CLI mode): `analyze-web-bundle` found 4 hashed chunks (`index`, `motion`, `three`, `HeroScene`). Library versions came from their license banners and version strings.
2. **Runtime capture:** a REA browser scenario, connected to a local Chromium, showed `HeroScene` and the 815 KB `three` chunk loading after the first page load. So the 3D code is lazy-loaded.
3. **Reading the code:** the minified main bundle was pretty-printed and traced by hand, from the gate through the scan, dispatcher and jobs.
4. **Measurement:** a Playwright probe recorded frame times and long tasks on desktop (1440×900), an emulated iPhone 13, and with reduced motion on.

**Limits:** there are no public source maps (the `*.map` URLs return the page's HTML). Headless Chromium has a fixed 60 Hz clock and software WebGL. Nothing was tested on real phones or 120 Hz screens. Facts below come from the code or a measurement unless marked *inferred*.

## How the agent-build intro works

The "agents" are coloured cursor elements moved by a scheduler in the browser. It works like a job queue with workers, the same pattern as Celery or RQ in Python.

&#91;embedded content: agent-build intro · gate, scan, build loop, end\]

Each element starts hidden (`data-ab="off"`) and appears only when its job ends. A cursor that finishes goes back to the free pool for the next dispatch. Desktop also draws cursor trails, rulers and guides; touch devices skip them.

## Why it feels smooth on every device

The site keeps each frame's work small and steady, and it gives weaker devices less work to do.

| Technique | What the site does | Why it helps |
| --- | --- | --- |
| One frame clock | Lenis, ScrollTrigger and the intro all run from `gsap.ticker`, with `lagSmoothing(0)` | Scrolling and animation update in the same frame instead of competing |
| Time-based easing | Every move uses 1 − e^(−k·dt), with dt capped at 50 ms | Same speed on 60 Hz and 120 Hz screens; one slow frame cannot cause a jump |
| Cheap properties only | Cursors, trails and frames move with `translate3d`; reveals use `clip-path` and `opacity` | The GPU can draw these without redoing the page layout |
| Write only on change | A frame's size and a text's clip-path are written only when the rounded value changes | Fewer style writes, so less style and layout work per frame |
| No React re-renders | HUD counters are written straight into the DOM through refs; 3D scroll progress goes through a ref | React does no work while the animation runs |
| Device tiers | Desktop: 18–30 agents, 44 s, trails and guides. Touch: 8–14 agents, 26 s, no extras | Phones get roughly half the work |
| Lazy, adaptive 3D | Three.js loads after the first page load, only with WebGL; pixel ratio capped at 1.5; paused off screen; below 45 fps it drops to 700 particles from 1,800 | The heaviest code never delays first paint and backs off on slow GPUs |
| Native touch scroll | Lenis keeps `syncTouch: false`; ScrollTrigger uses `ignoreMobileResize: true`; the custom cursor needs a fine pointer | Phones keep native scrolling; the address bar showing or hiding does not restart ScrollTrigger's measurements |
| Fonts first | The scan waits for `document.fonts.ready` (or 1.5 s); ScrollTrigger refreshes after fonts load | Measurements use the final font, so nothing jumps later |
| Reduced motion | No intro, no 3D, no Lenis; CSS sets every animation and transition to 0.001 ms | Motion-sensitive visitors get a still page |
| Safe failure | The build loop runs inside try/catch; any error ends the intro and shows the page | A bug can never leave the page hidden |

## Weak spots, and what our build does differently

The intro freezes the main thread once at the start and keeps reading layout while it runs. The numbers below come from headless Chromium with no GPU and a fixed 60 Hz clock.

| Profile | Agents | Frame median / p95 | Frames over 25 ms | Long tasks (longest) |
| --- | --- | --- | --- | --- |
| Desktop 1440×900 | 18–19 | 16.7 / 66.6 ms | 74 | 18 (707 ms) |
| iPhone 13 (emulated) | 8 | 16.7 / 33.4 ms | 32 | 5 (409 ms) |
| Reduced motion | none | 16.7 / 16.8 ms | 2 | 1 (100 ms) |

- **One big freeze (cause inferred):** the scan calls `getComputedStyle` and `getBoundingClientRect` on about 553 elements in one go. That forces the browser to do style and layout work all at once.
- **Layout reads every 70 ms:** each dispatcher pass reads up to 260 element rectangles.
- **Pessimistic numbers (inferred):** software WebGL in the test container likely makes these worse than on real devices.
- **Look:** heavy gradients, which was your main design complaint.
- **Not checked:** what a screen reader hears while the page is hidden during the build.

Our portfolio rebuilds the mechanic clean-room, with no code copied:

- **Done in Milestone 2:** an ASCII knot on a canvas instead of an 815 KB Three.js chunk, a flat paper-and-ink palette with no gradients, and Plain view for recruiters.
- **Planned for Milestone 3:** a scan sliced into \~8 ms pieces per frame, layout reads batched before writes, pooled cursor nodes, and unit tests for the gate, scheduler and easing.

## Key numbers

Values were read from the site's shipped main bundle, except the layer count, which was measured. They appear in the order the intro uses them.

| Setting | Value | What it controls |
| --- | --- | --- |
| Scan phase | 1.7 s, after fonts load (or 1.5 s at most) | The "scanning" look before building starts |
| Layers found | 553 on desktop | How many pieces get built |
| Dispatcher | every 70 ms | How often free cursors get new jobs |
| Dispatch window | top 86% of the screen, up to 260 layers a pass | Which layers can be handed out |
| Agents | desktop 18 → 30, touch 8 → 14 | Grows in a straight line with progress |
| Text reveal | clamp(0.24 + 0.014 × characters, 0.3, 1.5) s | Longer text takes longer, within limits |
| Icon reveal | 0.16 s | Small items finish almost at once |
| Easing strength k | 15 on a job, 3.2 wandering, 30 for trails | How fast a cursor closes the gap to its target |
| Frame time cap | dt at most 50 ms | Stops jumps after a slow frame |
| Target length | desktop 44 s, touch 26 s | Auto-scroll speed is set to finish around then |
| Auto-scroll speed | 60–1,500 px/s | Waits the first 2.4 s and whenever 15+ layers are pending |
| Speed buttons | 1×, 2×, 4× | Multiplies every timer |
| Skip triggers | wheel or touch scroll, Space, Page Up/Down, arrows, Home, End, Escape, Ctrl/Cmd+K, clicking a link or button, moving focus, scrolling 90+ px | The visitor is always in control |
| Hard cap | 150 s | The intro always ends |

## Sources

- [project.fahimweb.online](https://project.fahimweb.online/): the live site, analysed on 2026-11-24.
- [Portfolio site animation smoothness](https://github.com/Jaikarthik-codes/Katen-Kyokotsu/blob/main/reports/Portfolio%20site%20animation%20smoothness.md): the original findings and measurements, in your repo.
- The site's shipped main bundle (`index-CDzqgV_z.js`): the intro code, re-checked for this report on 2026-11-27.
