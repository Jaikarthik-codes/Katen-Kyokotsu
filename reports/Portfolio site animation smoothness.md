# Portfolio site animation smoothness

How the "agent build" intro animation on https://project.fahimweb.online/ works, and how the site keeps its animations smooth across devices. Analysed on 2026-11-24 with REA (`rea-agents` 6.10.1, CLI mode), by reading the site's shipped JavaScript and CSS, and with a short Playwright probe.

Labels: **Observed** = seen in the shipped code or measured. **Inferred** = reasoning from those observations.

## 1. Stack (Observed)

| Part | Library / version | Evidence |
|---|---|---|
| App | React, built with Vite | REA `analyze-web-bundle` found 4 hashed chunks: `index`, `motion`, `three`, `HeroScene` (evidence `ev_3c9c3d90…`) |
| Scroll animations | GSAP 3.12.5 + ScrollTrigger + Observer | License banners in `index-*.js` |
| Smooth scroll | Lenis 1.1.16 | Version string and `lenis-*` class names in `motion-*.js` |
| UI motion | framer-motion 11.11.17 | Version string; `@emotion/is-prop-valid` optional require |
| 3D hero | Three.js r169 through React Three Fiber | `HeroScene-*.js` (Canvas, useFrame, MathUtils.damp) |

REA's browser scenario (evidence `ev_cb2b0383…`) showed that `HeroScene` and the 815 KB `three` chunk load **after** the first page load step, so the 3D code is lazy-loaded.

No public source maps exist. `*.map` URLs return the SPA's `index.html` through a catch-all rewrite.

## 2. The "agent build" intro (Observed, main bundle)

The "agents" are coloured cursor `div`s driven by a job scheduler in the browser. **No AI or backend is involved.**

1. **Gate.** The intro is skipped when any of these apply:
   - `prefers-reduced-motion: reduce`
   - a low-tier device (Save-Data on, `deviceMemory < 4`, or `hardwareConcurrency < 4`)
   - a bot or headless user agent
   - a deep link (`#hash`)
   - `sessionStorage["agent-build-seen"]` is already set

   `?build` forces it to play.
2. **Hide.** `html.ab-building` hides the header, main and footer. Each element gets `data-ab="off"`.
3. **Scan.** It walks the DOM and classifies elements as `text`, `box`, `media`, `icon` or `decor`. The desktop page has 553 "layers".
4. **Swarm.** Desktop starts 18 agents and grows to 30 as progress rises. Touch or low-tier devices get 8 to 14.
5. **Dispatcher.** Every 70 ms it collects unbuilt elements on screen and gives each one to the nearest free agent (greedy nearest-neighbour). This is the same pattern as a work queue with workers claiming jobs (Celery/RQ).
6. **Job.** Each job has a `travel` phase, then a `work` phase.
   - **Text** is revealed line by line with a CSS `clip-path` polygon, behind an I-beam cursor.
   - **Boxes and media** get a frame with a "W × H" label that grows from the top-left with an ease-out cubic, then fade in through the Web Animations API.
7. **Auto-scroll.** Lenis `scrollTo(..., {immediate:true})` scrolls the page at a speed chosen to finish in about 44 s (26 s on low-tier devices).
8. **End.** The intro finishes when every layer is built and the page has reached the bottom, or at a 150 s cap. Any wheel, touch, key or click skips it.

Optional extras: rulers and guides (rich mode only), Web Audio blips (off by default), and 1×/2×/4× speed.

## 3. Why it stays smooth (Observed unless marked)

- **One frame clock.** Lenis runs from `gsap.ticker` (`lenis.raf(time*1000)`) with `lagSmoothing(0)`. `ScrollTrigger.update` runs on each Lenis scroll event. The build loop uses the same ticker.
- **Cheap properties.** Agents, trails and frames move with `translate3d`, and reveals use `clip-path` and `opacity`. A frame's width and height are only written when their rounded values change.
- **Time-based motion.** Easing uses `1 - exp(-k·dt)` and `MathUtils.damp`, and `dt` is capped at 50 ms, so speed is the same on 60 Hz and 120 Hz screens.
- **Device tiers.** A React context exposes `reduced`, `touch` and `tier`, and it re-reads the media queries live when they change.
- **Adaptive 3D.**
  - The 3D code is lazy-loaded behind a WebGL support check.
  - `dpr` is capped at `[1, 1.5]`; antialias and stencil are off.
  - `frameloop` is set to `"never"` when the hero is off screen (IntersectionObserver).
  - An FPS watchdog checks the frame rate after about 2.5 s. Below 45 fps it switches to low quality: 700 particles instead of 1800, one ring and the star field removed, and `dpr` set to 1.
  - Scroll progress is passed through a ref, so it causes no React re-renders.
- **Responsive animations.** `gsap.matchMedia`:
  - At ≥1024×640 the projects section is pinned and scrolls horizontally.
  - On smaller screens each project slide fades up once.
- **Touch handling.**
  - ScrollTrigger is configured with `ignoreMobileResize: true`.
  - Lenis keeps its default `syncTouch: false`, so touch scrolling stays native.
  - The custom cursor only appears with a fine pointer.
- **Reduced motion.** No intro, no 3D and no Lenis. A CSS rule sets all animations and transitions to 0.001 ms.
- **Fonts.** `ScrollTrigger.refresh()` runs after `document.fonts.ready`.

## 4. Measurement (Observed; headless Chromium, no GPU, fixed 60 Hz clock)

| Profile | Agents | Frame median / p95 | Frames > 25 ms | Long tasks (longest) |
|---|---|---|---|---|
| Desktop 1440×900 | 18–19 | 16.7 / 66.6 ms | 74 | 18 (707 ms) |
| iPhone 13 (emulated) | 8 | 16.7 / 33.4 ms | 32 | 5 (409 ms) |
| Reduced motion | none | 16.7 / 16.8 ms | 2 | 1 (100 ms) |

**Inferred:** software WebGL in the container makes these numbers worse than on real devices.

**Inferred weak spot:** the 707 ms long task is most likely the one-time scan. It calls `getComputedStyle` and `getBoundingClientRect` on about 553 elements at once, which forces style and layout work. The dispatcher also reads up to 260 element rectangles every 70 ms.

**Not verified:** behaviour on real phones, real GPUs, and 120 Hz screens.
