/**
 * Decides whether the build intro runs.
 *
 * This file must have NO imports: tools/head-gate-plugin.ts inlines it into
 * <head> so the decision is made before the first paint (no flash of the page
 * before it hides). The same code is unit-tested here.
 */

export interface GateEnv {
  reducedMotion: boolean;
  saveData: boolean;
  deviceMemory: number | null;
  cores: number | null;
  userAgent: string;
  webdriver: boolean;
  hash: string;
  search: string;
  plainView: boolean;
  seenAt: number | null;
  now: number;
}

export type GateReason =
  | 'reduced-motion'
  | 'plain-view'
  | 'opt-out'
  | 'forced'
  | 'deep-link'
  | 'seen'
  | 'bot'
  | 'low-power'
  | 'ok';

export interface GateDecision {
  run: boolean;
  reason: GateReason;
}

export const SEEN_KEY = 'ab:seen';
export const VIEW_KEY = 'ab:view';
export const SEEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed/i;

function hasFlag(search: string, flag: string): boolean {
  try {
    return new URLSearchParams(search).has(flag);
  } catch {
    return false;
  }
}

/** Checks run in priority order: the first one that matches wins. */
export function decide(env: GateEnv): GateDecision {
  if (env.reducedMotion) return { run: false, reason: 'reduced-motion' };
  if (env.plainView) return { run: false, reason: 'plain-view' };
  if (hasFlag(env.search, 'nobuild')) return { run: false, reason: 'opt-out' };
  if (hasFlag(env.search, 'build')) return { run: true, reason: 'forced' };
  if (env.hash.length > 1) return { run: false, reason: 'deep-link' };
  if (env.seenAt !== null && env.now - env.seenAt < SEEN_TTL_MS) {
    return { run: false, reason: 'seen' };
  }
  if (env.webdriver || BOT_UA.test(env.userAgent)) return { run: false, reason: 'bot' };
  const lowMemory = env.deviceMemory !== null && env.deviceMemory < 4;
  const fewCores = env.cores !== null && env.cores < 4;
  if (env.saveData || lowMemory || fewCores) return { run: false, reason: 'low-power' };
  return { run: true, reason: 'ok' };
}

interface NavigatorHints {
  userAgent?: string;
  webdriver?: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

export function readEnv(win: Window, now: number = Date.now()): GateEnv {
  let seenAt: number | null = null;
  let plainView = false;
  try {
    const storage = win.localStorage;
    const raw = storage.getItem(SEEN_KEY);
    const parsed = raw === null ? Number.NaN : Number(raw);
    seenAt = Number.isFinite(parsed) ? parsed : null;
    plainView = storage.getItem(VIEW_KEY) === 'plain';
  } catch {
    // Storage is blocked (private mode, cookies off): treat it as a first visit.
  }

  const matches = (query: string): boolean => {
    try {
      return typeof win.matchMedia === 'function' && win.matchMedia(query).matches;
    } catch {
      return false;
    }
  };

  const nav = (win.navigator ?? {}) as NavigatorHints;
  const cores = nav.hardwareConcurrency;
  return {
    reducedMotion: matches('(prefers-reduced-motion: reduce)'),
    saveData: nav.connection?.saveData === true,
    deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    cores: typeof cores === 'number' && cores > 0 ? cores : null,
    userAgent: nav.userAgent ?? '',
    webdriver: nav.webdriver === true,
    hash: win.location.hash ?? '',
    search: win.location.search ?? '',
    plainView,
    seenAt,
    now,
  };
}

/** Runs in <head>: applies Plain view and marks the page "pending" when the intro will run. */
export function runHeadGate(win: Window = window): GateDecision {
  const env = readEnv(win);
  const decision = decide(env);
  const html = win.document.documentElement;
  html.dataset.abGate = decision.reason;
  if (env.plainView) html.dataset.view = 'plain';
  if (decision.run) html.dataset.abPhase = 'pending';
  return decision;
}
