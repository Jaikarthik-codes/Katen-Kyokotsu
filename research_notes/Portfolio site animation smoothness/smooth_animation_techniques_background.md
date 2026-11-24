# Why the creative-portfolio animation stack is smooth on phones, laptops and high-refresh screens (background theory, state as of Nov 2026)

> Research conducted 2026-11-24. Library versions were checked against the live npm registry the same day:
> `gsap` **3.15.1** (published 2026-11-04), `lenis` **1.3.28** (2026-11-23), `motion` **14.14.0** and `framer-motion` **14.14.0** (both 2026-11-13), `three` **0.187.0** (2026-10-30), `locomotive-scroll` **5.1.1** (2026-11-13); `@studio-freight/lenis` stops at **1.0.42** (2024-03-17) and is marked deprecated. Sources: [npm gsap](https://registry.npmjs.org/gsap), [npm lenis](https://registry.npmjs.org/lenis), [npm @studio-freight/lenis](https://registry.npmjs.org/@studio-freight%2Flenis), [npm motion](https://registry.npmjs.org/motion), [npm framer-motion](https://registry.npmjs.org/framer-motion), [npm three](https://registry.npmjs.org/three), [npm locomotive-scroll](https://registry.npmjs.org/locomotive-scroll).
> Labels used below: **[Documented]** = official docs, specs or source code; **[Vendor claim]** = a library's own marketing or docs making a comparative claim; **[Community]** = blog or forum posts; **[Opinion]** = a judgement call.

## 1. Browser rendering pipeline: style → layout → paint → composite, compositor-only properties, `will-change`, frame budgets

### Takeaway
Every visual change costs as much as the earliest pipeline stage it dirties. `transform` and `opacity` skip layout and paint and only need compositing, which can happen off the main thread. That is the main reason the portfolio stack stays smooth: it routes nearly all motion through those two properties, inside a per-frame budget of about 16.7 ms at 60 Hz (about 10 ms of it usable) and about 8.3 ms at 120 Hz.

### Cited Findings
**The pipeline stages [Documented]**
- web.dev lists five stages a developer controls: **JavaScript** (or CSS animations, transitions or the Web Animations API), **Style calculations** (which rules match which elements, then computed styles), **Layout** (geometry; "one element can affect others", e.g. the body's width affects descendants), **Paint** ("filling in pixels… text, colors, images, borders, shadows", drawn "onto multiple surfaces, often called layers"), and **Composite** (layers "applied to the screen in the correct order"). Paint itself is two tasks: building a list of draw calls, then rasterization. — [web.dev, "Rendering performance" (Paul Lewis; no date shown)](https://web.dev/articles/rendering-performance)
- A frame does not always run every stage. There are "three ways the pipeline normally plays out", the most expensive being "JS / CSS > Style > Layout > Paint > Composite". — [web.dev, Rendering performance](https://web.dev/articles/rendering-performance)
- Chrome's renderer process has a **main thread** plus separate **compositor and raster threads** "to render a page efficiently and smoothly". — [Chrome for Developers, "Inside look at modern web browser (part 3)" (Mariko Kosaka)](https://developer.chrome.com/blog/inside-browser-part3)

**Why `transform` and `opacity` are cheap [Documented]**
- "The best-performing version of the pixel pipeline avoids both layout and paint, and only requires compositing changes… Today there are only two properties for which that is true - `transform`s and `opacity`." The caveat is that the element "should be on its own compositor layer". — [web.dev, "Stick to compositor-only properties and manage layer count" (Paul Lewis)](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)
- Motion's docs explain why layout properties are slow. Changing `height` can affect siblings and children, so the layout of every affected element must be recalculated and then repainted and recomposited. "Many styles affect layout, like `height`, `border-width`, `padding`, `position`." "Re-renders can easily take upwards of 100ms!" — [Motion docs, "Animation performance"](https://motion.dev/docs/performance)
- `box-shadow` and `border-radius` "can be updated without triggering a render, but do require a potentially expensive paint". Repaint time "is proportional to its [layer] size". — [Motion docs, Animation performance](https://motion.dev/docs/performance)
- **[Vendor claim, time-sensitive]** "Chrome and Firefox handle `filter` and SVGs entirely on the compositor, and Chrome is adding support for `background-color` and `clip-path` soon." Motion suggests animating `filter: drop-shadow()` instead of `box-shadow`, and `clip-path: inset(0 round 50px)` instead of `border-radius`. It also says the "CSS Triggers" reference site is "very out of date". — [Motion docs, Animation performance](https://motion.dev/docs/performance)
- To change layout cheaply anyway, web.dev points to the **FLIP** technique, which remaps layout changes onto transform and opacity. — [web.dev, Stick to compositor-only properties](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)

**What `will-change` does, and what overuse costs [Documented]**
- `will-change` is "a rendering hint to the browser about how an element is expected to change". It applies to the element's whole subtree, so putting it on large sections "can actually be bad for a page's performance". It should be "a last resort… Don't use it to anticipate performance problems." It also creates a stacking context up front, e.g. with `will-change: opacity`. — [MDN, will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
- MDN's guidance is to "switch `will-change` on and off using script code before and after the change occurs". Left in a stylesheet, it makes the browser "keep the optimizations for a much longer time". "Excessive use… will result in excessive memory use." — [MDN, will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
- Promotion with `will-change: transform` (or the legacy `transform: translateZ(0)`) creates a layer, but "every layer you create requires memory and management… on devices with limited memory the impact on performance can far outweigh any benefit… Every layer's textures needs to be uploaded to the GPU", which is limited by CPU→GPU bandwidth and GPU texture memory. A `* { will-change: transform }` "layer explosion" is explicitly warned against. Aim for compositing to take about **4–5 ms** during scrolling and transitions. — [web.dev, Stick to compositor-only properties](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)
- Motion: "Creating new layers doesn't come for free. Each takes space on the GPU." 3D transforms and `perspective` can promote "more elements than you might expect". — [Motion docs, Animation performance](https://motion.dev/docs/performance)

**Frame budget [Documented]**
- At 60 Hz the browser "has 16.66 milliseconds to produce each frame… In reality… the browser has its own overhead for each frame, so all of your work needs to be completed inside **10 milliseconds**." A missed budget makes content "judder on-screen… often called jank". — [web.dev, Rendering performance](https://web.dev/articles/rendering-performance)
- "If we want to change the `height` of an element at 60fps, we need to be able to re-render in 16.7 milliseconds… at 120fps… this time window can be reduced further to 8ms." — [Motion docs, Animation performance](https://motion.dev/docs/performance)
- "At 120Hz, the refresh interval drops to 8.3 milliseconds." — [MacRumors, "Enable Smoother 120Hz Browsing in Safari" (2026-05-05)](https://www.macrumors.com/how-to/enable-smoother-120hz-browsing-in-safari/)

**Code example: compositor-only vs layout-triggering, plus scripted `will-change`**
```css
/* Janky: layout + paint + composite on every frame */
.card.bad  { transition: left .4s, box-shadow .4s; }
.card.bad:hover  { left: 20px; box-shadow: 0 20px 40px #0004; }

/* Smooth: composite-only */
.card.good { transition: transform .4s, opacity .4s; }
.card.good:hover { transform: translateX(20px); opacity: .9; }
```
```js
// MDN pattern: hint just before, release after
el.addEventListener('mouseenter', () => el.style.willChange = 'transform');
el.addEventListener('animationend', () => el.style.willChange = 'auto');
```
(CSS adapted from the property guidance in [web.dev](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count). The JS follows MDN's "via script" guidance on [will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change).)

### Inferences
- Plain terms: layout is "work out where everything goes", paint is "colour in the pixels", composite is "stack the finished pictures". Moving a pre-painted layer with `transform` is like sliding a photo across a table. Changing `top` or `width` is like redrawing the photo and rearranging the whole table on every frame.
- The 1000/60 ≈ 16.7 ms and 1000/120 ≈ 8.3 ms figures are simple arithmetic. If web.dev's roughly 6 ms of browser overhead held at 120 Hz too, the usable JS budget would be only about 2–4 ms. That is my extrapolation, not a documented figure. In practice it means 120 Hz screens leave almost no room for main-thread work, so off-main-thread (compositor) animation matters even more on them.
- Portfolio sites look "buttery" mostly because of discipline about *what* they animate (transform and opacity, `clip-path` reveals, WebGL), not because one library is magic.

### Gaps
- I did not retrieve the full web.dev text for the "paint-only" and "composite-only" pipeline variants. The fetched copy was truncated after variant 1, so those two are described from the compositor article and Motion's docs instead.
- web.dev's two articles show no publish or update date in the fetched copies. They are older Paul Lewis articles that Google still hosts.
- I found no single authoritative, current cross-browser list of which properties run on the compositor in 2026. Motion's statement is a vendor claim with "soon" wording.

## 2. requestAnimationFrame: refresh-rate sync, background-tab pausing, and why time-based (delta) animation beats frame-based animation

### Takeaway
rAF calls you once per display refresh: 60, 90, 120 or 144 Hz depending on the screen, and less in Safari, Low Power Mode or background tabs. Animation that advances by elapsed time rather than by frame count therefore looks the same on every device. Safari is an important exception: by default it delivers rAF at **60 Hz even on 120 Hz ProMotion screens**.

### Cited Findings
- "The frequency of calls to the callback function will generally match the display refresh rate. The most common refresh rate is 60hz… though 75hz, 120hz, and 144hz are also widely used." rAF calls "are paused in most browsers when running in background tabs or hidden `<iframe>`s, in order to improve performance and battery life." It is one-shot, so the callback must re-request. — [MDN, Window.requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- **Warning [Documented]:** "Be sure always to use the first argument (or some other method for getting the current time) to calculate how much the animation will progress in a frame — otherwise, the animation will run faster on high refresh-rate screens." — [MDN, requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- The callback receives a `DOMHighResTimeStamp` for "the end time of the previous frame's rendering". All callbacks in one frame get the same timestamp, so animations can be synchronised across callbacks. MDN also notes that "some browsers have a multi-frame delay between the initial call… and the first call", and recommends taking the zero point from the first callback. — [MDN, requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- GSAP docs: when the tab is hidden, "the browser itself throttles down `requestAnimationFrame` event dispatching". Typical rate is "around 60 times per second… Some modern devices update at 120hz." — [GSAP docs, gsap.ticker](https://gsap.com/docs/v3/GSAP/gsap.ticker)

**Apple ProMotion / Safari specifics [Documented in WebKit bug tracker and commits]**
- A WebKit engineer (Antoine Quint) wrote that page rendering updates are "60Hz by default on ProMotion displays… This is true… [for] all page rendering, including requestAnimationFrame callbacks. The feature flag 'Prefer Page Rendering Updates near 60fps' can be disabled to have that cadence set to 120Hz." — [WebKit Bug 290671 (Mar–Apr 2025)](https://bugs.webkit.org/show_bug.cgi?id=290671)
- Disabling that flag on iPhone Pros did not unlock 120 Hz until a fix landed around iOS 18 betas (mid-2024). iPad Pro and MacBook Pro already honoured it. PWAs "only run off of system default feature flags", so they stay at 60. — [WebKit Bug 272165 (2024)](https://bugs.webkit.org/show_bug.cgi?id=272165); [WebKit Bug 280183 (Sep 2024)](https://bugs.webkit.org/show_bug.cgi?id=280183)
- A WebKit commit (2025-12-23) says the iOS display link "only ever opts into a higher frame rate than the default 60fps if 'Prefer Page Rendering Updates near 60fps' is disabled, whereas it's enabled by default". It changes **threaded time-based animations** (the new off-main-thread CSS/WAAPI path) to run at 120 Hz while rAF stays at 60 fps. Low Power Mode drops callbacks to "around 30fps". — [WebKit commit 2876fe9](https://github.com/WebKit/WebKit/commit/2876fe9)
- Lenis lists among its limitations: "capped to 60fps on Safari" and "30fps on low power mode". — [Lenis README (v1.3.28)](https://github.com/darkroomengineering/lenis)
- MacRumors (2026-05-05) says Safari is "locked to 60fps page rendering by default" on ProMotion iPhone, iPad and Mac, and shows the Feature Flags toggle. A reader comment on that page claims native *scrolling* is already 120 Hz and the flag only affects CSS/JS animations **[Opinion, unverified]**. — [MacRumors](https://www.macrumors.com/how-to/enable-smoother-120hz-browsing-in-safari/)
- **[Community, single source, experimental]** A 2026-11-20 blog post claims `canvas.transferControlToOffscreen()` lets an OffscreenCanvas present at about 120 fps on iOS WebKit without the flag. — [rida.dev](https://rida.dev/blog/bypassing-ios-safari-60-fps-limit)

**Code example: time-based (delta) animation [Documented, MDN]**
```js
let start;
function step(t) {               // t = DOMHighResTimeStamp (ms)
  start ??= t;
  const x = Math.min(0.1 * (t - start), 200);  // 0.1 px per ms, refresh-rate independent
  el.style.transform = `translateX(${x}px)`;
  if (x < 200) requestAnimationFrame(step);
}
requestAnimationFrame(step);
```
— [MDN, requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

### Inferences
- Frame-based code such as `x += 2` every frame moves twice as fast on a 120 Hz laptop as on a 60 Hz phone, and slows down whenever frames drop. Time-based code (`x = speed × elapsed`) gives the same motion everywhere and simply gets more in-between samples on faster screens.
- On iPhones, a JS-driven portfolio (GSAP, Lenis or a three.js loop) by default renders at 60 Hz while native scrolling and, after the late-2025 WebKit work, threaded CSS/WAAPI animations may run at 120 Hz. So "smooth on iPhone" usually means "a solid 60 fps without dropped frames", not 120. Whether the threaded-animations path has shipped in stable Safari by Nov 2026 is unverified.
- Background-tab pausing is free battery saving for any rAF-based stack. It is also why GSAP needs lagSmoothing (section 3): when the tab returns, the first frame sees a huge time delta.

### Gaps
- No official Chrome or Android doc retrieved on variable refresh rate (VRR or LTPO panels) and rAF cadence. MDN's general statement is the only citation.
- Whether Safari 26.x (2026) changed the default of "Prefer Page Rendering Updates near 60fps" could not be confirmed. MacRumors (May 2026) implies it was still on by default.

## 3. GSAP: ticker, lagSmoothing, force3D, read/write batching, ScrollTrigger, matchMedia, licensing

### Takeaway
GSAP runs every tween, timeline and ScrollTrigger from **one** rAF-driven ticker, so it does one synchronised update per frame. It recovers gracefully from CPU stalls (lagSmoothing), promotes transforms to the GPU only while they animate (`force3D: "auto"`), and throttles scroll and resize work. ScrollTrigger layers scroll-linking (`scrub`, `pin`) on top, plus mobile-specific fixes (`ignoreMobileResize`, `normalizeScroll`), while `gsap.matchMedia()` swaps or reverts whole animation setups by breakpoint and reduced-motion preference. Since 3.13 (29 Apr 2025) the whole toolset, plugins included, is free.

### Cited Findings
**Ticker: a single heartbeat [Documented]**
- "The `gsap.ticker` is like the heartbeat of the GSAP engine - it updates the globalTimeline on every `requestAnimationFrame` event, so it is perfectly synchronized with the browser's rendering cycle." Listeners receive `(time /*s*/, deltaTime /*ms*/, frame)`. `add(fn, once, prioritize)` (3.10.0+) can run a callback before the global timeline. If rAF is unavailable, the ticker falls back to `setTimeout`. — [GSAP docs, gsap.ticker](https://gsap.com/docs/v3/GSAP/gsap.ticker)
- `gsap.ticker.fps(30)` can only *lower* the rate: "it isn't possible to have the browser speed up the native `requestAnimationFrame` events". `deltaRatio(60)` (3.5.0+) returns e.g. `2` when a frame took twice as long, "so that you can easily set up loops that dynamically adjust to frame rate variations". — [GSAP docs, gsap.ticker](https://gsap.com/docs/v3/GSAP/gsap.ticker)
- `autoSleep` (default `120` frames, "about every 2 seconds") checks whether GSAP can "power-down the internal ticker to conserve system resources and battery life on mobile devices". — [GSAP docs, gsap.config()](https://gsap.com/docs/v3/GSAP/gsap.config()/)

**lagSmoothing [Documented]**
- GSAP uses "a strict timing model that prioritizes perfect synchronization". lagSmoothing "adjusts the core timing mechanism on the next tick which affects all animations, thus everything remains perfectly synchronized": if more than `threshold` ms elapse between ticks, the engine acts as if only `adjustedLag` ms elapsed. — [GSAP docs, gsap.ticker](https://gsap.com/docs/v3/GSAP/gsap.ticker)
- Defaults are **threshold 500 ms, adjustedLag 33 ms**, so a 2-second CPU freeze advances animations by only 33 ms instead of jumping. `lagSmoothing(0)` disables it. — [GSAP blog, "GSAP 1.12.0" (2014-06-24)](https://gsap.com/community/gsap-1-12-0/). (The current v3 ticker page uses the same explanatory wording, but my fetched copy was cut off before the defaults sentence. See Gaps.)
- Lenis's README sets `gsap.ticker.lagSmoothing(0)` when integrating, so scroll-driven animation never lags behind the real scroll position. — [Lenis README](https://github.com/darkroomengineering/lenis)

**force3D / translate3d [Documented]**
- "`force3D` - GSAP automatically attempts to maximize rendering performance by applying transforms with 3D components like `translate3d()` instead of `translate()` during the animation to activate GPU acceleration, and then switches back to the 2D variant at the end (if possible) to conserve GPU memory. That describes `force3D:"auto"` behavior (the default)." `true` keeps 3D, and `false` disables the behaviour. — [GSAP docs, gsap.config()](https://gsap.com/docs/v3/GSAP/gsap.config()/)
- The original motivation was memory: "try animating 2000 elements with 3D transforms on an iPhone and then scroll the page - it gets pretty janky." — [GSAP 1.12.0 blog (2014)](https://gsap.com/community/gsap-1-12-0/). A GSAP moderator explains that translate3d "uses more memory as it has to store a rasterized version of the graphic, kind of like CSS's will-change". — [GSAP forums (2021)](https://gsap.com/community/forums/topic/27832-timeline-keeps-going-switching-between-translate3d-and-translate/)
- GSAP's shorthand transforms (`x`, `y`, `xPercent`, `scale`, `rotation`) let it skip parsing the browser's `matrix()`/`matrix3d()` and always apply transforms in a fixed order, which "offers performance gains". Layout properties are "far too complex for a normal tween" and are routed to the FLIP plugin. — [GSAP docs, CSSPlugin](https://gsap.com/docs/v3/GSAP/CorePlugins/CSS)

**Batching DOM reads and writes [Documented]**
- GSAP introduced "lazy" rendering, which "helps avoid layout thrashing when many animations start simultaneously" by deferring the first render of newly started tweens so reads and writes are not interleaved. — [GSAP 1.12.0 blog (2014)](https://gsap.com/community/gsap-1-12-0/)
- ScrollTrigger is "Highly optimized… scroll events are debounced, updates are synchronized with GSAP and screen refreshes, resize recalculations are throttled". — [GSAP docs, ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)

**ScrollTrigger: scrub, pin, refresh [Documented]**
- `scrub: true` links progress directly to the scrollbar. `scrub: 1` "takes 1 second to 'catch up' to the scrollbar", which smooths out jerky wheel input. `pin: true` locks the trigger element and adds padding automatically (`pinSpacing`). ScrollTrigger "Automatically recalculates positions when the window resizes". It uses "No scroll-jacking", and integrates with ScrollSmoother or third-party scrollers via `scrollerProxy()`. — [GSAP docs, ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- `anticipatePin` exists because "most modern browsers handle scroll repaints on a separate thread", so the browser may briefly paint unpinned content before JS applies the pin. — [GSAP docs, ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- By default ScrollTrigger calls `refresh()` on `"visibilitychange,DOMContentLoaded,load,resize"` (configurable via `autoRefreshEvents`, 3.6.0+), and polls scroll position every 200 ms (`syncInterval`) to keep velocity accurate. — [GSAP docs, ScrollTrigger.config()](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.config())
- `ignoreMobileResize: true` (3.10.0+): "vertical resizes (of 25% of the viewport height) on touch-only devices won't trigger a ScrollTrigger.refresh(), avoiding the jumps" when the mobile address bar shows or hides. The trade-off is slightly inaccurate start and end positions. — [GSAP docs, ScrollTrigger.config()](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.config())
- `ScrollTrigger.normalizeScroll(true)` "Forces scrolling to be done on the JavaScript thread". It prevents [most] address-bar resizing, overscroll bounce and pin jumps from multi-threaded repaint, and works around iOS Safari bugs that misreport scroll position (by "skipping every other 'touchmove' event"). GSAP calls it "a hybrid form of scroll-jacking", and it is "considered an experimental feature". — [GSAP docs, normalizeScroll()](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.normalizeScroll())

**gsap.matchMedia() [Documented]**
- It runs setup code only while a media query matches. When the query stops matching, "all the GSAP animations and ScrollTriggers created during that function's execution get reverted automatically!" The conditions syntax lets one handler branch on `isDesktop`, `isMobile` and `reduceMotion: "(prefers-reduced-motion: reduce)"`. — [GSAP docs, gsap.matchMedia()](https://gsap.com/docs/v3/GSAP/gsap.matchMedia())

**Licensing (verified) [Documented]**
- GSAP 3.13 release, **April 29, 2025**: "Thanks to Webflow GSAP is now 100% FREE including ALL of the bonus plugins like SplitText, MorphSVG… even for commercial use!" All bonus plugins moved into the public npm package and GitHub repo, and Club GSAP was retired. The original team (Jack Doyle, Cassie Evans, Rodrigo) continue maintaining it. — [GSAP blog, 3.13 release](https://gsap.com/blog/3-13/); [Webflow blog, "Webflow makes GSAP 100% free"](https://webflow.com/blog/gsap-becomes-free)
- The governing "Standard 'No Charge' GSAP License" is effective April 30, 2025. According to search-result summaries, it restricts use in "Competitive Products" (visual animation builders similar to Webflow) without written permission. I did not fetch the license text directly. — [GSAP Standard License](https://gsap.com/community/standard-license/)
- SplitText was rewritten in 3.13 ("50% smaller, 14 new features"). It adds screen-reader `aria-label`/`aria-hidden` and `autoSplit`/`onSplit()` to "Avoid funky line breaks when resizing or when fonts load". It drops `position: "absolute"` because "most people animate transforms rather than top/left". — [GSAP blog, 3.13](https://gsap.com/blog/3-13/)
- Current npm version: **3.15.1** (2026-11-04). — [npm gsap](https://registry.npmjs.org/gsap)

**Code example: ScrollTrigger + matchMedia + mobile config**
```js
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });      // no refresh jump when the URL bar hides

const mm = gsap.matchMedia();
mm.add({ isDesktop: "(min-width: 800px)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
  const { isDesktop, reduce } = ctx.conditions;
  gsap.to(".hero-img", {
    yPercent: reduce ? 0 : -20,                           // transform only
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top",
                     scrub: isDesktop ? 1 : true, pin: isDesktop }
  });
});                                                       // auto-reverted when conditions change
```
(Assembled from the patterns in [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [config()](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.config()) and [matchMedia()](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()).)

### Inferences
- One ticker means one write pass per frame for every animation on the page, instead of dozens of independent rAF loops or timers competing. That is the structural reason big GSAP timelines stay in sync.
- `scrub: <number>` is effectively a built-in lerp between raw scroll and animation progress. It is a cheap way to get a "smooth" feel without a smooth-scroll library.
- The "jump when the iPhone URL bar collapses" bug that amateur sites show is exactly what `ignoreMobileResize` and `normalizeScroll` address. Seeing these in a site's source signals deliberate mobile tuning.
- **[Opinion]** Since GSAP is now free, ScrollSmoother and SplitText are no longer reserved for paying studios, so they should become more common in 2025–2026 portfolios.

### Gaps
- The exact sentence giving current v3 lagSmoothing defaults was not captured. I relied on the 2014 1.12.0 post, whose wording the v3 page repeats. I am not aware of any change.
- I did not fetch release notes for GSAP 3.14 and 3.15, so I cannot say what changed between 3.13 and 3.15.1.
- I did not read the full license text.

## 4. Lenis smooth scroll: how it works, touch handling, GSAP integration; vs Locomotive Scroll v4 and ScrollSmoother

### Takeaway
Lenis keeps the **real, native scroll position**. It intercepts wheel input, eases a target value toward the destination each frame with a frame-rate-independent exponential "damp", and writes the result back with `window.scrollTo()`. So `position: sticky`, anchors, find-in-page and accessibility keep working, and touch scrolling stays fully native unless you opt in with `syncTouch`. Older libraries such as Locomotive Scroll v4 replaced native scrolling with virtual-scroll events, a custom scrollbar and transforms on the page. GSAP's ScrollSmoother keeps the native scrollbar but still moves the content with `matrix3d()` transforms.

### Cited Findings
**Package and setup [Documented]**
- The package is `lenis` (npm, v**1.3.28**, published 2026-11-23). The old `@studio-freight/lenis` is deprecated: "The '@studio-freight/lenis' package has been renamed to 'lenis'. Please update your dependencies: npm install lenis" (last version 1.0.42, 2024-03-17). The repo now lives at `darkroomengineering/lenis` and is credited to "darkroom.engineering". I did not source a statement on whether that is a rebrand of Studio Freight. — [npm @studio-freight/lenis](https://registry.npmjs.org/@studio-freight%2Flenis); [Lenis README](https://github.com/darkroomengineering/lenis)
- Defaults: `lerp: 0.1` ("interpolation intensity", 0–1), `duration: 1.2` s and `easing` (both ignored when `lerp` is set), `smoothWheel: true`, **`syncTouch: false`**, `syncTouchLerp: 0.075`, `touchInertiaExponent: 1.7`, `touchMultiplier: 1`, `wheelMultiplier: 1`, `autoRaf: false`, `autoResize: true` (uses `ResizeObserver`), `anchors: false`, `overscroll: true`, **`respectReducedMotion: true`** (smoothing off, and `scrollTo` jumps instantly). — [Lenis README](https://github.com/darkroomengineering/lenis)
- Limitations it lists: no CSS `scroll-snap` (use `lenis/snap`), "capped to 60fps on Safari… 30fps on low power mode", stops working over iframes "since they don't forward wheel events", `position: fixed` lag on pre-M1 macOS Safari, and `syncTouch` "may behave unexpectedly" on iOS < 16. Nested scrollers need `data-lenis-prevent` or `allowNestedScroll`. — [Lenis README](https://github.com/darkroomengineering/lenis)
- Lenis's site claims: "no CSS transforms, no hijacked scrollbars, no accessibility trade-offs", "under 5kb", and "Those jumps and delays in scroll-linked animations come from browsers running effects asynchronously with native scroll. Lenis was built to keep WebGL and the DOM perfectly in sync" **[Vendor claim]**. It also says Lenis now powers Locomotive Scroll. — [lenis.darkroom.engineering](https://lenis.darkroom.engineering/)

**How it works, from the shipped source (lenis 1.3.28 `dist/lenis.mjs`) [Documented]**
- The animated value is updated with `damp(this.value, this.to, this.lerp * 60, deltaTime)`, where `damp(x, y, λ, dt) = lerp(x, y, 1 - Math.exp(-λ * dt))`. This is exponential smoothing scaled by real elapsed time, so the feel is the same at 60 Hz and 120 Hz. The result is written to the real scroller via `wrapper.scrollTo({...})`. — [npm tarball lenis-1.3.28](https://registry.npmjs.org/lenis/-/lenis-1.3.28.tgz) (inspected locally)
- In the wheel and touch handler, Lenis only takes over when `(syncTouch && isTouch) || (smoothWheel && isWheel)`. Otherwise it leaves the event to the browser, so with defaults, **touch scrolling is 100% native**. It also reads `matchMedia("(prefers-reduced-motion: reduce)")`. — [npm tarball lenis-1.3.28](https://registry.npmjs.org/lenis/-/lenis-1.3.28.tgz)
- The recommended `lenis.css` sets `html.lenis, html.lenis body { height: auto; }`, `overflow: clip` when stopped, `overscroll-behavior: contain` on `[data-lenis-prevent]` areas, and `.lenis.lenis-smooth iframe { pointer-events: none; }`. — [lenis/dist/lenis.css (1.3.28)](https://registry.npmjs.org/lenis/-/lenis-1.3.28.tgz)

**GSAP ScrollTrigger integration [Documented]**
```js
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
const lenis = new Lenis();                       // don't also set autoRaf when GSAP drives it
lenis.on('scroll', ScrollTrigger.update);        // tell ScrollTrigger every time Lenis moves
gsap.ticker.add((time) => lenis.raf(time * 1000)); // GSAP ticker gives seconds, Lenis wants ms
gsap.ticker.lagSmoothing(0);                     // never let GSAP "slow time" behind scroll
```
— [Lenis README](https://github.com/darkroomengineering/lenis). Standalone use is `new Lenis({ autoRaf: true })`, or calling `lenis.raf(time)` from your own rAF loop. — [Lenis README](https://github.com/darkroomengineering/lenis)

**Why smooth scroll is usually off on touch [Documented and Opinion]**
- Lenis defaults to `syncTouch: false` (above). ScrollSmoother's default is "NO smoothing on touch devices", with an optional short `smoothTouch: 0.1`. — [GSAP docs, ScrollSmoother](https://gsap.com/docs/v3/Plugins/ScrollSmoother/)
- Locomotive Scroll v5 uses "Smart Touch Detection" where parallax is "auto-disabled on mobile". — [Locomotive Scroll GitHub](https://github.com/locomotivemtl/locomotive-scroll)
- **[Opinion/inference]** Phones already provide hardware-tuned momentum scrolling, often at 120 Hz on the compositor thread. Re-implementing it in JS at a (Safari-capped) 60 Hz adds latency and fights the OS physics, which is why every major library ships with touch smoothing off.

**Comparison with "transform-the-whole-page" scrollers**
- **Locomotive Scroll v4 (4.1.4)** README: in `smooth: true` mode it depends on **Virtual Scroll** ("Custom scroll event with inertia/momentum"). It appends its own scrollbar element (`scrollbarClass: 'c-scrollbar'`, "Smooth only"), uses `lerp: 0.1`, and has `tablet`/`smartphone` overrides to turn smoothing off per context. — [npm locomotive-scroll-4.1.4 README](https://registry.npmjs.org/locomotive-scroll/-/locomotive-scroll-4.1.4.tgz) (inspected locally)
- **Locomotive Scroll v5 (5.1.1)**: "Built on top of Lenis", keeps the "Native scrollbar", uses "Dual Intersection Observers", and is "Only 9.9kB gzipped". — [Locomotive Scroll GitHub](https://github.com/locomotivemtl/locomotive-scroll); [npm locomotive-scroll](https://registry.npmjs.org/locomotive-scroll)
- **GSAP ScrollSmoother** "leverages NATIVE scrolling - it doesn't add 'fake' scrollbars". However, content must sit in `#smooth-wrapper > #smooth-content`, and "ScrollSmoother applies transforms to the content to gradually catch up with that scroll position… using inline CSS transforms (`matrix3d()`)". `position: fixed` elements must live outside the wrapper. It adds `data-speed` and `data-lag` parallax, and an optional `normalizeScroll: true`. — [GSAP docs, ScrollSmoother](https://gsap.com/docs/v3/Plugins/ScrollSmoother/)

### Inferences
- Plain terms: Lenis is "a soft spring between your mouse wheel and the real scrollbar". The page really does scroll, just eased. The older approach froze the real page and slid a giant transformed `<div>` to fake scrolling. That needed fake scrollbars and broke `position: sticky`/`fixed` inside the container, find-in-page and native accessibility. Lenis exists to avoid those problems.
- Because Lenis writes the native scroll position and ScrollTrigger reads it, both see the same value in the same GSAP tick. The jitter between "where the page is" and "where the animation thinks it is" disappears.
- The exponential `damp` with real `deltaTime` is the same time-based principle as section 2, applied to scrolling.
- I could not grep a `translate3d` string from the v4 bundle (the file name may differ), so "v4 transforms the scroll container" rests on general knowledge plus ScrollSmoother's documented analogous design. Treat it as likely but not verified from v4 source.

### Gaps
- The Lenis "Manifesto" and docs site deep pages were not fetched.
- I found no benchmark comparing input latency for Lenis vs ScrollSmoother vs native.

## 5. Motion (formerly Framer Motion): WAAPI hardware acceleration, springs, useReducedMotion, layout animations

### Takeaway
Motion is a hybrid engine. Where it can, it hands transform, opacity, filter and similar animations to the browser's Web Animations API, which can run them on the compositor thread and stay smooth even when React or other JS blocks the main thread. It falls back to a rAF loop for everything else. Springs give velocity-aware, natural motion. `useReducedMotion` and transform-based layout animations cover accessibility and the "FLIP" problem.

### Cited Findings
- **Rename [Documented]:** "To upgrade to Motion for React, uninstall `framer-motion` and install `motion`… swap imports from 'framer-motion' to 'motion/react'". Version 14.0 has "no breaking changes". — [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide). Both `motion` and `framer-motion` are still published in lockstep at **14.14.0** (2026-11-13). — [npm motion](https://registry.npmjs.org/motion); [npm framer-motion](https://registry.npmjs.org/framer-motion)
- **Hardware acceleration [Documented/Vendor]:** "The JavaScript code will always run on the main JS thread… if your app is running other JS code at the same time, your animation code could be blocked… However, WAAPI and CSS can run some animations off the main JS thread, directly on the compositor… An animation that is hardware accelerated will remain smooth, no matter how busy your main JS thread becomes. Because Motion is built on WAAPI, it can also run hardware accelerated animations." The same page notes that rAF-based engines, "like GSAP and Motion", run on the main thread for non-accelerated values. — [Motion docs, Animation performance](https://motion.dev/docs/performance)
- "Because Motion is built on the Web Animations API, browsers are smart enough to automatically place elements animating these values on a new graphical layer." — [Motion docs, Animation performance](https://motion.dev/docs/performance)
- `animate()` comes in **mini (3.2kb)**, which uses native browser APIs, and **hybrid (22kb)**, which adds independent transforms (`x`, `y`, `rotateZ`), CSS variables, SVG paths, sequences, and JS or three.js objects. — [Motion docs, animate()](https://motion.dev/docs/animate)
- **Springs [Documented]:** `type: "spring"` is either physics-based (`stiffness`, `damping`, `mass`), which "incorporate the velocity of any existing gestures or animations for natural feedback", or duration-based (`duration`, `bounce`), which "always lasts exactly its duration… and can also be generated as pure CSS". Tween default `duration` is 0.3 s. — [Motion docs, Transitions](https://motion.dev/docs/react-transitions)
- **useReducedMotion [Documented]:** it "returns `true` if the current device has Reduced Motion setting enabled", and "will actively respond to changes and re-render". Suggested uses: replace `x`/`y` motion with opacity, disable autoplaying background video, turn off parallax. — [Motion docs, useReducedMotion](https://motion.dev/docs/react-use-reduced-motion)
- **Layout animations [Documented]:** `<motion.div layout />` animates any layout change, and `layoutId` does shared-element transitions. "Animating layout is traditionally slow, but Motion performs all layout animations using the CSS `transform` property for the highest possible performance." — [Motion docs, Layout animation](https://motion.dev/docs/react-layout-animations)
- Motion 10 removed the `IntersectionObserver` fallback for `whileInView` (IO "supported by all modern browsers"). — [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide)

**Code example: accelerated spring + reduced motion (React)**
```jsx
import { motion, useReducedMotion } from "motion/react";
export function Card({ open }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      layout                                       // size/position changes animated via transform
      animate={{ opacity: open ? 1 : 0, x: open ? 0 : (reduce ? 0 : "-100%") }}
      transition={{ type: "spring", visualDuration: 0.4, bounce: 0.2 }}
    />
  );
}
```
(Pattern from [useReducedMotion](https://motion.dev/docs/react-use-reduced-motion), [Transitions](https://motion.dev/docs/react-transitions) and [Layout animation](https://motion.dev/docs/react-layout-animations) docs.)

### Inferences
- Main difference from GSAP: GSAP computes every frame in JS on one ticker, which gives exact sync and works for any property. Motion offloads what it can to the browser's compositor. In a heavy React site that is busy rendering, Motion's accelerated opacity and transform animations can survive main-thread jank that would stutter a pure-rAF engine. Neither approach helps if you animate layout properties.
- Given the WebKit change in section 2 (threaded time-based animations at 120 Hz on iOS), WAAPI-driven animations may get 120 Hz on ProMotion iPhones where rAF engines are held to 60. This depends on whether that WebKit work has shipped and is not verified for stable Safari.

### Gaps
- The full list of values Motion accelerates (the "Accelerated values" section) was truncated in my fetch. Motion's docs say "transform and o[pacity]…", and the rest is unverified.
- I did not verify whether Motion's independent `x`/`y` transform shorthands are accelerated, or fall back to rAF, in each browser.

## 6. Three.js / WebGL backgrounds: keeping them smooth (DPR caps, pausing off-screen, mobile quality)

### Takeaway
A full-screen WebGL canvas costs roughly in proportion to pixels shaded, which is *devicePixelRatio²*. Smooth portfolio sites cap DPR (typically `Math.min(devicePixelRatio, 2)`, lower on phones), stop the render loop when the canvas is off-screen or the tab is hidden, drive animation from elapsed time, and cut draw calls and expensive materials on mobile.

### Cited Findings
*(The official three.js manual was not retrievable in this session; see Gaps. The findings below are **[Community]** practice from 2024–2026 posts that agree with each other.)*
- "Many phones report a `devicePixelRatio` of 3. Rendering at that ratio means nine times the pixels of a ratio of 1, and the visual gain over 2 is hard to see. Capping it is the cheapest win in Three.js: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`. For heavy scenes, consider lowering the cap to 1.5 on mobile, or adjusting it dynamically when frame time climbs." — [Akshay Pachouri, "Three.js Performance Optimization" (2026-09-13)](https://www.akshaypachouri.com/blog/threejs-performance-optimization/)
- A table of pixels shaded: DPR 2 means 4×, DPR 3 means 9×; a cap of 2 gives 4×, a cap of 1.5 gives 2.25×. "A cap of 1.5 is often indistinguishable on a moving background while cutting fragment work by almost half." The post also recommends reading time from the loop "instead of counting frames, so speed does not change with the display", and using `setSize(w, h, false)` so three.js does not overwrite CSS sizing. — [AnimatedWebs, "How to Add three.js to a Website" (updated 2026-10-28)](https://animatedwebs.com/guides/add-threejs-to-a-website)
- "Browsers throttle `requestAnimationFrame` in background tabs, but a canvas scrolled out of view on a long page keeps rendering. Use an `IntersectionObserver` to stop the loop… and the `visibilitychange` event for hidden tabs." It also suggests render-on-demand for static scenes. — [Akshay Pachouri (2026)](https://www.akshaypachouri.com/blog/threejs-performance-optimization/); same pattern in [didof.dev (2024-02-12)](https://didof.dev/blog/optimize-threejs-4-key-techniques/) and [RiverPoint (2026-11-04)](https://riverpointco.com/blog/threejs-on-a-business-website/)
- On mid-range Android, "a realistic WebGL allocation is 8 to 10ms per frame for your scene". Draw calls matter more than triangles: `InstancedMesh` "turned a starfield from over a thousand draw calls into one". Drop DPR to about 1.25 when the budget is breached (e.g. drei's `AdaptiveDpr`). Under reduced motion, render one static frame or skip WebGL entirely. — [Nabin Ghimire, "Three.js at 60fps on Mid-Range Android" (2026-02-10)](https://www.nabinghimire23.com.np/blog/threejs-60fps-mid-range-android)
- Prefer unlit or simply lit materials for backgrounds, bake lighting, turn shadows off ("Shadow maps add extra render passes"), and reuse geometry and materials. — [AnimatedWebs (2026)](https://animatedwebs.com/guides/add-threejs-to-a-website)
- **[Documented, WebKit]** In Safari, three.js scenes synced to scroll through a rAF loop are "capped at 60hz", unlike compositor-only CSS animations. — [WebKit Bug 290671 (2025)](https://bugs.webkit.org/show_bug.cgi?id=290671)
- three.js current version: **0.187.0** (r187, 2026-10-30). — [npm three](https://registry.npmjs.org/three)

**Code example: DPR cap + pause when invisible**
```js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
const isTouch = matchMedia('(pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
const clock = new THREE.Clock();
const tick = () => { mesh.rotation.y = clock.getElapsedTime() * 0.3; renderer.render(scene, camera); };
let onScreen = true;
const sync = () => renderer.setAnimationLoop(onScreen && !document.hidden ? tick : null);
new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(canvas);
document.addEventListener('visibilitychange', sync);
sync();
```
(Combines the cited community patterns; `setAnimationLoop(null)` stops the loop, per [AnimatedWebs](https://animatedwebs.com/guides/add-threejs-to-a-website).)

### Inferences
- Plain terms: on a DPR-3 phone (e.g. a 390×844 CSS-px viewport is about 1170×2532 ≈ 3 million device pixels), a full-screen shader colours 9× the pixels it would at DPR 1, every frame. Capping at 2 cuts that to about 1.3 million. That is my own arithmetic. Capping DPR is the single biggest lever. Pausing invisible canvases also frees GPU time for the DOM scroll animations further down the page.
- A WebGL background is drawn into a single canvas. The browser composites that canvas like any other layer, so as long as the JS and GPU work fits the frame budget, it doesn't add layout or paint cost to the page.

### Gaps
- **The official three.js manual ("Responsive Design", "Rendering on demand") could not be fetched.** The page is client-rendered, the GitHub API was blocked for this session, and the raw path returned 404. So no official three.js wording on `setPixelRatio` is quoted here. The report writer should treat the DPR cap as consensus community practice, not an official recommendation.
- No Codrops/Tympanus article was retrieved.

## 7. Accessibility & adaptivity: prefers-reduced-motion, pointer/hover media queries, IntersectionObserver

### Takeaway
Smooth portfolio sites adapt rather than force one experience. They honour the OS "reduce motion" setting (in CSS, `gsap.matchMedia`, `useReducedMotion` and Lenis defaults), enable custom cursors and hover effects only for fine, hover-capable pointers, and start or stop animations with IntersectionObserver so work only happens for what is visible.

### Cited Findings
- `prefers-reduced-motion` detects a device setting "to minimize the amount of non-essential motion". Such animations "can trigger discomfort for those with vestibular motion disorders. Animations such as scaling or panning large objects can be vestibular motion triggers." `@media (prefers-reduced-motion)` is equivalent to `: reduce`. It is set via iOS Settings > Accessibility > Motion, Android 9+ "Remove animations", Windows "Animation Effects", and macOS Accessibility > Display (or > Motion on newer macOS). MDN's example *tones down* motion (a scale pulse becomes an opacity dissolve) rather than removing all feedback. Baseline since January 2020. — [MDN, prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion). (MDN labels Tahoe as "macOS 25"; Apple's numbering calls it macOS 26, a minor doc inconsistency.)
- `pointer`: `coarse` means "a pointing device of limited accuracy, such as a finger on a touchscreen", and `fine` means "an accurate pointing device, such as a mouse". `any-pointer` tests all devices. Baseline since December 2018. — [MDN, pointer](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer)
- `hover: none` means the primary input "cannot hover at all or cannot conveniently hover (e.g., many mobile devices emulate hovering when the user performs an inconvenient long tap)". `hover: hover` means it "can conveniently hover". — [MDN, hover](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover)
- IntersectionObserver runs callbacks when elements enter or leave the viewport, replacing main-thread `getBoundingClientRect()` polling that made pages "sluggish". MDN lists "Deciding whether or not to perform tasks or animation processes based on whether or not the user will see the result" as a core use. It can't report exact pixel overlap, only threshold crossings. Baseline since March 2019. — [MDN, Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- Library hooks: `gsap.matchMedia()` with `reduceMotion: "(prefers-reduced-motion: reduce)"` ([GSAP docs](https://gsap.com/docs/v3/GSAP/gsap.matchMedia())); Motion `useReducedMotion()` ([Motion docs](https://motion.dev/docs/react-use-reduced-motion)); Lenis `respectReducedMotion: true` by default ([Lenis README](https://github.com/darkroomengineering/lenis)); SplitText 3.13 adds `aria-label`/`aria-hidden` so split text is not read letter by letter ([GSAP 3.13](https://gsap.com/blog/3-13/)); Motion makes tap targets keyboard-accessible (`tabindex="0"`) since v9 ([Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide)).
- ScrollTrigger's own pitch: tie animations to the viewport "so that it only plays when that element is in the viewport. This improves performance". — [GSAP docs, ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)

**Code example: custom cursor only for mouse/trackpad, motion only when allowed**
```css
.cursor { display: none; }
@media (hover: hover) and (pointer: fine) {
  .cursor { display: block; }              /* custom cursor for mouse/trackpad only */
  body    { cursor: none; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```
```js
const io = new IntersectionObserver((entries) => entries.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}), { threshold: 0.2 });
document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
```
(Media features per MDN [hover](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover), [pointer](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer) and [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion); IO per [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API). The global reduced-motion reset is a common community snippet, not an MDN recommendation. MDN's own example *replaces* motion with gentler motion.)

### Inferences
- A custom cursor on a phone is pure cost. It means a rAF loop following a finger that has no hover, plus an extra layer. `(hover: hover) and (pointer: fine)` gating removes that cost on touch devices, which is part of why well-built portfolio sites feel lighter on phones.
- Adaptivity is also a performance feature. The same `matchMedia` branches that respect accessibility usually remove pins, parallax and WebGL on small or touch screens, which are the most frame-expensive effects.

### Gaps
- No WCAG 2.2 success-criterion text (e.g. 2.3.3 Animation from Interactions) was fetched.

## 8. Loading techniques that protect smoothness: preloaders, fonts, lazy loading, image formats, layout shift

### Takeaway
Most "jank" on first view is not animation cost. It is the page still changing underneath the animation: fonts swapping, images arriving without reserved space, ScrollTrigger positions measured before layout settled. Portfolios protect smoothness by waiting for critical assets (`document.fonts.ready`, image decode) behind a preloader, reserving space to keep CLS near zero, lazy-loading below-the-fold media, and refreshing scroll measurements once everything has loaded.

### Cited Findings
- CLS "measures the instability of content". Good is "0.1 or less" for at least 75% of visits, and poor is "greater than 0.25". The most common causes are "Images without dimensions… Ads, embeds, and iframes without dimensions… Dynamically injected content… Web fonts." Post-load shifts from lazy-loaded content also count. — [web.dev, "Optimize Cumulative Layout Shift" (published 2020-05-05, updated 2025-02-07)](https://web.dev/articles/optimize-cls)
- Web fonts cause "Delayed text rendering" (hurting FCP and LCP), and "font swapping has the potential to cause layout shifts… when a web font and its fallback font take up different amounts of space". The guidance includes inlining `@font-face` in the `<head>` so fonts are discovered earlier, and using `preload` or the Font Loading API. — [web.dev, "Best practices for fonts" (Katie Hempenius, Barry Pollard)](https://web.dev/articles/font-best-practices)
- `document.fonts.ready` is a Promise that resolves "once the document has completed loading fonts, layout operations are completed, and no further font loads are needed". Baseline since January 2020. — [MDN, FontFaceSet.ready](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/ready)
- GSAP SplitText 3.13's `autoSplit`/`onSplit()` exist to "Avoid funky line breaks when resizing or when fonts load", which confirms font loading as a real cause of animation glitches. — [GSAP 3.13](https://gsap.com/blog/3-13/)
- ScrollTrigger auto-refreshes on `DOMContentLoaded` and `load` (as well as resize and visibilitychange) because positions measured before images and fonts load go stale. — [GSAP docs, ScrollTrigger.config()](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.config())
- Browser-level lazy loading (`loading="lazy"`) is supported from Chrome 77 and Firefox 75 (per the article's support table). — [web.dev, "Browser-level image lazy loading"](https://web.dev/articles/browser-level-image-lazy-loading)
- The browser's "preload scanner" fetches resources found in HTML in parallel with parsing, and parser-blocking `<script>` tags pause parsing unless `async` or `defer` is used. — [Chrome for Developers, Inside look at modern web browser part 3](https://developer.chrome.com/blog/inside-browser-part3)

**Code example: a preloader that waits for fonts and the hero image, then starts the intro**
```html
<img class="hero" src="hero.avif" width="1600" height="900" alt="" fetchpriority="high">
<img src="project-3.webp" width="800" height="600" loading="lazy" alt="Project 3">
```
```js
const hero = document.querySelector('.hero');
await Promise.all([document.fonts.ready, hero.decode().catch(() => {})]);
document.documentElement.classList.add('is-loaded');   // hide preloader via opacity/transform
ScrollTrigger.refresh();                               // measure with final fonts + images
gsap.from('.hero-title .char', { yPercent: 100, stagger: 0.02 });
```
(`document.fonts.ready` per [MDN](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/ready); explicit `width`/`height` per [web.dev CLS](https://web.dev/articles/optimize-cls); `loading="lazy"` per [web.dev lazy loading](https://web.dev/articles/browser-level-image-lazy-loading). `img.decode()` and `fetchpriority` are standard HTML APIs not separately sourced in this session.)

### Inferences
- A preloader is effectively a "settle the layout before you animate" gate. Once fonts and hero media are in, SplitText lines, ScrollTrigger start and end positions and WebGL textures are all measured against the final layout, so the intro timeline doesn't stutter or jump. **[Opinion]** Preloaders trade time-to-content for polish. They help smoothness but can hurt LCP if they hold the page for too long.
- Explicit `width`/`height` (or `aspect-ratio`) on media is doubly important on scroll-animated sites, because any late shift moves every pinned or scrubbed section after it.

### Gaps
- **`font-display` (swap/optional/fallback) semantics were not captured.** The web.dev font-display article returned not-found, and the "font rendering" section of the font best-practices page was truncated. Treat any `font-display` guidance in the final report as unverified here.
- **Modern image formats (AVIF/WebP) were not researched from a primary source** in this session.
- Network note: in this session WebFetch could not resolve web.dev, developer.mozilla.org or gsap.com directly. Those pages were read through the Exa server-side fetcher, so the quotes are from Exa's rendered copies, and some long pages were truncated.
