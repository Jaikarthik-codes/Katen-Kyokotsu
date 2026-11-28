/**
 * Every tuning value in one place. Values marked "report" come from the
 * reverse-engineering report in docs/reference/fahimweb-report.md.
 */
export const CONFIG = Object.freeze({
  /** report: the "scanning" look before building starts. */
  scanSeconds: 1.7,
  /** report: wait for fonts, but never longer than this. */
  fontWaitMs: 1500,
  /** Longest stretch of measuring before yielding to the browser. */
  sliceBudgetMs: 8,
  /** report: how often free agents get new jobs. */
  dispatchEvery: 0.07,
  /** report: only the top 86 % of the screen is handed out... */
  windowFraction: 0.86,
  /** report: ...up to 260 layers a pass. */
  windowLimit: 260,
  /** report: easing strength while working on a job and while wandering. */
  kJob: 15,
  kWander: 3.2,
  /** report: frame time cap. */
  maxDtMs: 50,
  /** report: text reveal = clamp(0.24 + 0.014 × chars, 0.3, 1.5) s. */
  textBase: 0.24,
  textPerChar: 0.014,
  textMin: 0.3,
  textMax: 1.5,
  /** report: icons finish almost at once. */
  iconSeconds: 0.16,
  /** Box and media frames: bigger boxes take a little longer. */
  boxBase: 0.32,
  boxPerPx: 1 / 3000,
  boxMin: 0.35,
  boxMax: 0.85,
  /** report: auto-scroll waits, pauses when agents fall behind, and is clamped. */
  scrollWait: 2.4,
  scrollPauseAt: 15,
  scrollMin: 60,
  scrollMax: 1500,
  /** report: the intro always ends. */
  hardCapSeconds: 150,
  /** report: the visitor scrolled this far away from auto-scroll, so they take over. */
  userScrollTolerance: 90,
  /** report: speed buttons. */
  speeds: [1, 2, 4] as const,
  /** report: layer count the reference timings were measured at. */
  referenceLayers: 553,
  /** Media this small or smaller is treated as an icon. */
  iconMaxSize: 40,
  /** An agent this close to its start point begins working. */
  arriveDistance: 6,
  /** An agent that has not arrived after this long starts anyway. */
  maxTravelSeconds: 0.9,
  /** Fade-in of a finished box, in ms (CSS uses the same value). */
  fadeMs: 220,
});
