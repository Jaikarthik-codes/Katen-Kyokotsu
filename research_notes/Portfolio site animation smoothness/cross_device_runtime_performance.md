# Cross-device runtime behaviour and animation performance of project.fahimweb.online

> **Superseded.** The network block described below was lifted later in the same session, and the site was analysed with REA and a Playwright probe. See `reports/Portfolio site animation smoothness.md` for the measured results. The scratchpad paths below were temporary and no longer exist.

> **Status (2026-11-24): no runtime measurement of the live site was possible from this session.** The session's egress proxy refuses `project.fahimweb.online`, so Playwright, curl and WebFetch could not load the page. Everything below labelled **MEASURED (site)** comes only from Exa's server-side crawl, which returns rendered text with scripts and styles stripped. Items labelled **MEASURED (harness)** come from my own Playwright/CDP harness, run on a local control page. They show what the harness can detect and the limits of headless emulation. They are **not** facts about the site. Items labelled **INFERRED** are reasoning, not evidence.
>
> **To unblock:** allow the host `project.fahimweb.online` in this session's network settings. Neither the current "Default" environment nor the other saved environment allows it. Then run the ready-made harness (path below). The first run will also list any third-party asset hosts (CDNs, fonts) that are still blocked, in each profile's `failed` array.
>
> **Re-run command, once the host is allowed:**
> `node /tmp/claude-0/-home-user-Katen-Kyokotsu/1034360b-c29f-56e0-a7d5-b5fa1357194b/scratchpad/perf_scripts/measure.js https://project.fahimweb.online/ /tmp/claude-0/-home-user-Katen-Kyokotsu/1034360b-c29f-56e0-a7d5-b5fa1357194b/scratchpad/perf_scripts/site_out`
> This runs six profiles: desktop 1440x900, desktop with reduced motion, iPad (gen 7), iPhone 13, Pixel 7, and Pixel 7 with 4x CPU throttling. It writes one JSON file and two screenshots per profile. The scratchpad is temporary, so copy the scripts if they need to be kept.

## Responsiveness: how layout and animation change across desktop (1440x900), tablet (iPad) and phone (iPhone, Pixel)

### Takeaway
I could not measure this, because the site was unreachable from the sandbox. The crawled content shows several heavily interactive parts: marquees, a draggable "cube", a code-editor panel, a terminal emulator and animated topology diagrams. These are exactly the parts a well-built site would usually simplify on touch devices. Whether this site does so is unknown.

### Cited Findings
- **MEASURED (access failure):** `curl https://project.fahimweb.online/` returned `CONNECT tunnel failed, response 403`. The proxy diagnostic said: `project.fahimweb.online:443 — connect_rejected, HTTP 403 (the egress proxy refused the connection…)`. Playwright Chromium failed with `net::ERR_TUNNEL_CONNECTION_FAILED`. WebFetch failed with `getaddrinfo ENOTFOUND project.fahimweb.online` and said the host must be allowed in the session's network settings. All three attempts were made on 2026-11-24. — [project.fahimweb.online](https://project.fahimweb.online/)
- **MEASURED (site, via Exa crawl):** The site is live. Its page title is "Faizul Islam Fahim — Network Systems Engineer & CEO in Dhaka". It is a single long page with these sections:
  - hero
  - two text marquees
  - a code panel titled `network/engineers/fahim.ts` with numbered lines 1–15
  - an experience timeline with "01 / 04" counters
  - a skills block ("Engineered for resilience, uptime, and scale") with the instruction **"Drag the cube or pick a category"**
  - projects ("01 / 04") with "System Architecture Blueprint" diagrams
  - services
  - an interactive topology ("Telemetry & Packet Lifecycle / VoIP PBX Call Session / Multi-WAN Failover & QoS / Multi-Branch VPN Provisioning / Replay Trace") with a `$ tail -f /var/log/asterisk/telecom-stream.log` log feed
  - a 7-step process ("01 / 07")
  - education
  - a terminal emulator ("visitor@fahimweb.online — zsh … Type help or tap a command below") with tappable command chips
  - a contact block ("Opens your email app with everything filled in")

  Source: [project.fahimweb.online (Exa crawl)](https://project.fahimweb.online/)
- **MEASURED (site, via Exa crawl):** Each marquee row's text appears **three times in a row**, for example "Network Systems Cloud PBX VoIP Infrastructure … Network Optimization" ×3, and "MikroTik Cisco … Solution Architecture" ×3. — [project.fahimweb.online (Exa crawl)](https://project.fahimweb.online/)
- **MEASURED (site):** `sitemap.xml` lists a single URL, `https://project.fahimweb.online/`, with lastmod `2026-11-06`. So the page measured in November 2026 is a recent build. — [sitemap.xml](https://project.fahimweb.online/sitemap.xml)
- **MEASURED (site):** `robots.txt` is `User-agent: * / Allow: /` and points to the sitemap. — [robots.txt](https://project.fahimweb.online/robots.txt)
- **MEASURED (site, via Exa):** Requesting `/manifest.json` returned the homepage content instead of a JSON manifest. — [manifest.json](https://project.fahimweb.online/manifest.json)
- **MEASURED (harness, control page):** Playwright device emulation does change the pointer media features. On the local control page, `matchMedia('(pointer: fine)')` returned `true` at desktop 1440x900 and `false` on `devices['Pixel 7']`. Pixel 7 emulation reported `innerWidth` 412 and `devicePixelRatio` 2.625. This means the harness will exercise any `(pointer: coarse)` / `(hover: hover)` gating the site has. The harness also wraps `window.matchMedia` and records every query the site's JS asks for, with its result (`mq` field). — own harness, `/tmp/claude-0/-home-user-Katen-Kyokotsu/1034360b-c29f-56e0-a7d5-b5fa1357194b/scratchpad/perf_scripts/test_out/desktop.json` and `pixel-4x.json`
- **Background:** Playwright `devices[...]` descriptors set the viewport, userAgent, deviceScaleFactor, isMobile and hasTouch. — [Playwright: Emulation](https://playwright.dev/docs/emulation)

### Inferences
- **INFERRED:** Repeating marquee text three times is the usual technique for a seamless infinite marquee. The track is duplicated and translated by a fixed fraction, either with a CSS `@keyframes` transform or a JS ticker. This is not confirmed.
- **INFERRED:** "Drag the cube" suggests either a CSS 3D-transform cube (`transform-style: preserve-3d`, `rotateX/Y`) or a WebGL canvas, driven by pointer events. On phones this is the most likely place to find touch-specific handling, for example `touch-action`, or replacing drag with tap via "or pick a category". Not confirmed.
- **INFERRED:** The terminal text says "Type help **or tap a command below**". This shows the author designed explicitly for touch input, so some touch-aware code path probably exists. Its exact form (CSS media queries or `matchMedia`) is unknown.
- **INFERRED (weak):** Getting the homepage back for `/manifest.json` fits an SPA-style "rewrite every path to index.html" host configuration, which points to a client-rendered app (for example Vite/React on Vercel, Netlify or Cloudflare Pages). Exa's own fetch behaviour could also explain it, so treat this as a hint only.

### Gaps
- Layout differences between 1440x900, iPad and phone (column count, hidden sections, whether the cube, topology and terminal are kept): **not measured, because the host was blocked.**
- Whether a custom cursor exists and is removed on touch: **unknown.** Exa's text crawl does not show cursor elements. The harness checks `[class*=cursor]` / `[id*=cursor]` elements and their computed `display`/`visibility` per profile.
- Use of `gsap.matchMedia()`, `(pointer: coarse)`, `(hover: hover)` or `ontouchstart`: **unknown.** Exa strips scripts and CSS. The harness greps every JS and CSS response body for these strings (`grep` field) and lists every `@media` rule (`pre.mediaQ`).

## Reduced motion: is `prefers-reduced-motion` respected?

### Takeaway
Unknown for the site. The harness is set up to answer it: it compares the number of running animations, inline style writes and frame activity between the desktop and desktop-with-reduced-motion profiles. It also counts `prefers-reduced-motion` in the CSS and greps the JS for it.

### Cited Findings
- **MEASURED (harness, control page):** With Playwright `reducedMotion: 'reduce'`, the control page's CSS rule `@media (prefers-reduced-motion: reduce){.marquee{animation:none}}` took effect. `document.getAnimations().length` dropped from **1** (desktop) to **0** (desktop with reduced motion). So the harness can detect CSS-level reduced-motion handling. — own harness, `/tmp/claude-0/-home-user-Katen-Kyokotsu/1034360b-c29f-56e0-a7d5-b5fa1357194b/scratchpad/perf_scripts/test_out/desktop-reduced.json`
- **MEASURED (harness):** The harness also caught the control page's JS asking for `(prefers-reduced-motion: reduce)` through the `matchMedia` wrapper (`mq: {'(prefers-reduced-motion: reduce)': false}` on desktop). This covers JS-level checks, such as `gsap.matchMedia()` or Framer Motion's `useReducedMotion`, which use `matchMedia` internally. — same file
- **Background:** Playwright's `reducedMotion` context option emulates the `prefers-reduced-motion` media feature. — [Playwright: BrowserContext options](https://playwright.dev/docs/api/class-browser#browser-new-context-option-reduced-motion)

### Inferences
- **INFERRED:** Some JS animation libraries skip `matchMedia` and read a cached value instead. A site could also gate motion only in CSS. So "no `matchMedia` call" would not prove the site ignores reduced motion. Compare `animCount`, `styleProps` and the screenshots across both desktop profiles.

### Gaps
- Whether the site disables or shortens marquees, the cube auto-rotation, typing effects or scroll reveals under reduced motion: **not measured, because the host was blocked.**

## Which CSS properties are animated (compositor-friendly transform/opacity, or layout properties)?

### Takeaway
Unknown for the site. The harness records every inline `style` property written while scrolling, which is how GSAP, Framer Motion and most JS animators work. It also lists running CSS/WAAPI animations, `will-change` and `content-visibility` usage, and counts `translate3d` / `backface-visibility` / `contain` in the stylesheets.

### Cited Findings
- **MEASURED (harness, control page):** A MutationObserver on `style` attributes, active only during the scripted scroll, produced a per-property write count. On the control page it recorded `{transform: 61, top: 36}`, with samples such as `DIV.par => transform: translate3d(0px, 60px, 0px); top: 2px;`. That correctly flags the layout property `top` I had planted next to the compositor-friendly `transform`. — own harness, `.../perf_scripts/test_out/desktop.json`
- **MEASURED (harness):** Computed-style scanning found `will-change: transform` on both control elements (`DIV.marquee`, `DIV.par`). `document.getAnimations()` reported the CSS animation by name (`m`) and target. — same file
- **MEASURED (harness):** The CDP `Performance.getMetrics` delta across the scroll (LayoutCount, RecalcStyleCount, LayoutDuration, ScriptDuration) is recorded for each profile. On the control page `LayoutCount` started at 2 and its delta was 0. The deltas need care on a real site, so check them alongside `styleProps`. — same file
- **Background:** Only `transform` and `opacity` changes can be handled entirely by the compositor. Animating layout properties (width, height, top, left, margin) triggers layout and paint on the main thread. — [web.dev: Stick to compositor-only properties and manage layer count](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)

### Inferences
- **INFERRED:** The visible design (marquees, a 3D cube, counters, a typing code panel, a streaming log and a terminal) can be built entirely from transform/opacity plus text updates. Typed text and log lines update `textContent`, which causes layout and paint inside a small box. That is cheap only if the box has a fixed size, ideally with `contain`. Not confirmed.

### Gaps
- The actual animated properties, `will-change` count, `translate3d` / `backface-visibility` / `contain` / `content-visibility` use: **not measured, because the host was blocked.**

## Frame timing: frame intervals, dropped frames, long tasks, CLS and LCP on desktop and on a phone profile with 4x CPU throttling

### Takeaway
I have no site data. The harness work did expose an important limit: headless Chromium's frame clock is pinned to about 60 Hz (16.67 ms). Even with 4x CPU throttling, a light page shows no drops. Frame-interval data from headless runs can therefore show main-thread-caused missed frames, but not 120 Hz behaviour or real mobile GPU limits.

### Cited Findings
- **MEASURED (harness, control page):** The rAF interval statistics during a scripted scroll matched in every profile:

  | Profile | Frames (n) | Mean | p50 | p95 | p99 | Max |
  |---|---|---|---|---|---|---|
  | Desktop 1440x900 | 315 | 16.67 ms | 16.7 | 16.8 | 16.8 | 16.8 |
  | Desktop, reduced motion | 314 | 16.67 ms | 16.7 | 16.8 | 16.8 | 16.8 |
  | iPhone 13 | 1058 | 16.67 ms | 16.7 | 16.8 | 16.8 | 16.8 |
  | Pixel 7 at **4x CPU throttle** | 1051 | 16.67 ms | 16.7 | 16.8 | 16.8 | 16.8 |

  In every profile, zero frames were over 25 ms, 33 ms or 50 ms. The frame clock is fixed at 60 Hz regardless of the emulated device. — own harness, `.../perf_scripts/test_out/*.json`
- **MEASURED (harness):** A planted 80 ms busy-loop was recorded by the `longtask` PerformanceObserver as `{t: 519, d: 80}`. The `layout-shift` (CLS), `largest-contentful-paint` and `paint` (FCP) observers all report correctly; the control page had LCP = `DIV.marquee` at about 44 ms and CLS = 0. — same files
- **MEASURED (harness):** Phone scrolling uses CDP `Input.dispatchTouchEvent` swipes (touchStart, 8× touchMove, touchEnd). These scrolled reliably, about 285 px per swipe on iPhone 13 and Pixel 7. `Input.synthesizeScrollGesture` with `gestureSourceType: 'touch'` was unreliable: under 4x throttling it left `scrollY` at 0 for all 25 gestures, while in one unthrottled run it scrolled but took about 578 ms per gesture. Desktop uses `mouse.wheel`. — own harness, `.../perf_scripts/touchtest.js`, `measure.js`
- **Background:** A long task is main-thread work lasting 50 ms or more. — [MDN: PerformanceLongTaskTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming)
- **Background:** "Good" thresholds are CLS ≤ 0.1 and LCP ≤ 2.5 s. — [web.dev: CLS](https://web.dev/articles/cls); [web.dev: LCP](https://web.dev/articles/lcp)
- **Background:** DevTools CPU throttling slows the host CPU by a multiplier, relative to the machine it runs on. It does not model a specific phone, its GPU or its display refresh rate. — [Chrome DevTools: Performance panel](https://developer.chrome.com/docs/devtools/performance)

### Inferences
- **INFERRED:** On the live site, the useful headless signals will be:
  1. long tasks during load and scroll, especially under 4x throttling;
  2. count of frames over 25 ms (main-thread stalls);
  3. Layout/RecalcStyle deltas;
  4. CLS from late-starting animations or preloader removal;
  5. which element is the LCP, and whether the LCP is delayed by an intro animation such as text starting at opacity 0.

  These signals cannot show compositor or GPU raster cost on real phones, or 120 Hz ProMotion behaviour, because the clock is 60 Hz.
- **INFERRED:** If the site uses WebGL for the cube, headless Chromium may fall back to software rendering (SwiftShader). Headless frame times for that canvas would then be pessimistic and unrepresentative.

### Gaps
- All site frame-timing, long-task, CLS, LCP and FCP numbers: **not measured, because the host was blocked.**

## Loading strategy: image formats, lazy loading, srcset, video, fonts, JS size and code splitting, preloader gating

### Takeaway
Unknown for the site. The harness records every response with its byte size and content type, bytes per resource type, `<img>` attributes (`loading`, `srcset`, `sizes`, `decoding`, `currentSrc`), `<video>` attributes, `<canvas>` elements, `<link rel=preload/preconnect>`, script `async`/`defer`/`type=module`, `document.fonts` status, and `font-display` in the CSS.

### Cited Findings
- **MEASURED (site, via Exa crawl):** The crawled text names no images or videos; Exa's markdown output keeps no image tags. Most visuals seem to be text- and diagram-based: "System Architecture Blueprint" panels with VLAN labels, IP subnets, RTT and SIP-trunk stats, and topology tiers. — [project.fahimweb.online (Exa crawl)](https://project.fahimweb.online/)
- **MEASURED (harness):** The control-page run confirmed that `img.loading`, `srcset`, `sizes`, `decoding`, the request list with byte counts, and the CSS `@media` rule list are all captured per profile. — own harness, `.../perf_scripts/test_out/desktop.json`

### Inferences
- **INFERRED:** The diagrams (VLAN map, node lists with RTTs, SIP-trunk stats, topology tiers, log feed) are written as text in the page rather than as raster screenshots, so they are probably HTML/SVG. That would keep image weight low and make JS and fonts the main loading cost. Not confirmed.

### Gaps
- Image formats (webp/avif), lazy loading, srcset, video, font preloading and `font-display`, total JS bytes, number of chunks, and whether intro animations wait for a preloader, fonts or images: **not measured, because the host was blocked.**

## Scroll implementation: native scroll or a transformed "fake smooth scroll" wrapper?

### Takeaway
Unknown for the site. The harness checks this directly. After each scroll step it records `window.scrollY` and any element taller than 1.5 viewports that has a non-`none` transform. Native or Lenis-style scrolling shows a rising `scrollY` and no tall transformed wrapper. A Locomotive-v4 or ScrollSmoother-style wrapper shows `scrollY` staying near 0, or `body` set to `overflow:hidden`, plus a tall element with a changing `translate3d`.

### Cited Findings
- **MEASURED (harness, control page):** On a page with native scroll, `scrollY` rose 200 → 3400 px in 200 px wheel steps on desktop and about 285 px per touch swipe on phones. No tall transformed wrapper was reported. The harness also records `html`/`body` `overflow` and `scroll-behavior`, and checks for `Lenis`, `LocomotiveScroll`, `ScrollSmoother`, `gsap`, `ScrollTrigger`, `THREE` and React/Vue/Next globals. It also greps bundles for `lenis`, `smoothTouch` and `syncTouch`, Lenis's touch options. — own harness, `.../perf_scripts/test_out/*.json`

### Inferences
- **INFERRED:** Nothing in the crawled text shows which scroll approach the site uses.

### Gaps
- Native or transformed scroll, any smooth-scroll library, and whether smoothing is turned off on touch: **not measured, because the host was blocked.**
