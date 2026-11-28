import { beforeEach, describe, expect, it } from 'vitest';
import {
  decide,
  readEnv,
  runHeadGate,
  SEEN_KEY,
  SEEN_TTL_MS,
  VIEW_KEY,
  type GateEnv,
} from './gate';

const NOW = 1_800_000_000_000;
const CHROME_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

function env(over: Partial<GateEnv> = {}): GateEnv {
  return {
    reducedMotion: false,
    saveData: false,
    deviceMemory: 8,
    cores: 8,
    userAgent: CHROME_UA,
    webdriver: false,
    hash: '',
    search: '',
    plainView: false,
    seenAt: null,
    now: NOW,
    ...over,
  };
}

describe('decide', () => {
  it('runs on a normal first visit', () => {
    expect(decide(env())).toEqual({ run: true, reason: 'ok' });
  });

  it('never runs with reduced motion, even when forced', () => {
    expect(decide(env({ reducedMotion: true, search: '?build' }))).toEqual({
      run: false,
      reason: 'reduced-motion',
    });
  });

  it('skips in plain view, even when forced', () => {
    expect(decide(env({ plainView: true, search: '?build' }))).toEqual({
      run: false,
      reason: 'plain-view',
    });
  });

  it('skips with ?nobuild', () => {
    expect(decide(env({ search: '?ref=cv&nobuild' }))).toEqual({ run: false, reason: 'opt-out' });
  });

  it('forces with ?build past every other skip reason', () => {
    const everythingSaysSkip = env({
      search: '?build',
      hash: '#projects',
      seenAt: NOW - 1000,
      webdriver: true,
      saveData: true,
    });
    expect(decide(everythingSaysSkip)).toEqual({ run: true, reason: 'forced' });
  });

  it('does not treat ?builder=1 as the force flag', () => {
    expect(decide(env({ search: '?builder=1' }))).toEqual({ run: true, reason: 'ok' });
  });

  it('skips deep links', () => {
    expect(decide(env({ hash: '#projects' }))).toEqual({ run: false, reason: 'deep-link' });
  });

  it('skips when seen within the last 7 days', () => {
    expect(decide(env({ seenAt: NOW - 1000 }))).toEqual({ run: false, reason: 'seen' });
  });

  it('runs again once 7 days have passed', () => {
    expect(SEEN_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(decide(env({ seenAt: NOW - SEEN_TTL_MS - 1 }))).toEqual({ run: true, reason: 'ok' });
  });

  it('skips crawlers by user agent', () => {
    const googlebot = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
    expect(decide(env({ userAgent: googlebot }))).toEqual({ run: false, reason: 'bot' });
  });

  it('skips headless browsers', () => {
    const headless = CHROME_UA.replace('Chrome/', 'HeadlessChrome/');
    expect(decide(env({ userAgent: headless }))).toEqual({ run: false, reason: 'bot' });
  });

  it('skips automated browsers', () => {
    expect(decide(env({ webdriver: true }))).toEqual({ run: false, reason: 'bot' });
  });

  it('skips data-saver, low-memory and low-core devices', () => {
    expect(decide(env({ saveData: true })).reason).toBe('low-power');
    expect(decide(env({ deviceMemory: 2 })).reason).toBe('low-power');
    expect(decide(env({ cores: 2 })).reason).toBe('low-power');
  });

  it('treats unknown memory and cores as capable', () => {
    expect(decide(env({ deviceMemory: null, cores: null }))).toEqual({ run: true, reason: 'ok' });
  });
});

interface FakeWindowOptions {
  storage?: Record<string, string> | 'throws';
  reducedMotion?: boolean;
  search?: string;
}

function fakeWindow(opts: FakeWindowOptions = {}): Window {
  const win: Record<string, unknown> = {
    document,
    matchMedia: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') && Boolean(opts.reducedMotion),
    }),
    navigator: {
      userAgent: CHROME_UA,
      webdriver: false,
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { saveData: false },
    },
    location: { search: opts.search ?? '', hash: '' },
  };
  if (opts.storage === 'throws') {
    Object.defineProperty(win, 'localStorage', {
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
  } else {
    const data = new Map(Object.entries(opts.storage ?? {}));
    win.localStorage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    };
  }
  return win as unknown as Window;
}

describe('readEnv', () => {
  it('survives throwing storage', () => {
    const read = readEnv(fakeWindow({ storage: 'throws' }), NOW);
    expect(read.seenAt).toBeNull();
    expect(read.plainView).toBe(false);
  });

  it('reads the seen time and plain view from storage', () => {
    const read = readEnv(
      fakeWindow({ storage: { [SEEN_KEY]: String(NOW - 5000), [VIEW_KEY]: 'plain' } }),
      NOW,
    );
    expect(read.seenAt).toBe(NOW - 5000);
    expect(read.plainView).toBe(true);
  });

  it('ignores a corrupt seen value', () => {
    const read = readEnv(fakeWindow({ storage: { [SEEN_KEY]: 'yesterday' } }), NOW);
    expect(read.seenAt).toBeNull();
  });

  it('reads reduced motion, device hints and the URL', () => {
    const read = readEnv(fakeWindow({ reducedMotion: true, search: '?build' }), NOW);
    expect(read).toMatchObject({
      reducedMotion: true,
      search: '?build',
      cores: 8,
      deviceMemory: 8,
      saveData: false,
      webdriver: false,
      now: NOW,
    });
  });

  it('works when matchMedia and device hints are missing', () => {
    const win = fakeWindow() as unknown as Record<string, unknown>;
    delete win.matchMedia;
    win.navigator = { userAgent: CHROME_UA };
    const read = readEnv(win as unknown as Window, NOW);
    expect(read).toMatchObject({
      reducedMotion: false,
      cores: null,
      deviceMemory: null,
      saveData: false,
    });
  });
});

describe('runHeadGate', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.abPhase;
    delete document.documentElement.dataset.view;
  });

  it('marks the page pending when the intro should run', () => {
    expect(runHeadGate(fakeWindow()).run).toBe(true);
    expect(document.documentElement.dataset.abPhase).toBe('pending');
  });

  it('leaves the page visible when the intro is skipped', () => {
    expect(runHeadGate(fakeWindow({ reducedMotion: true })).run).toBe(false);
    expect(document.documentElement.dataset.abPhase).toBeUndefined();
  });

  it('applies plain view before first paint', () => {
    runHeadGate(fakeWindow({ storage: { [VIEW_KEY]: 'plain' } }));
    expect(document.documentElement.dataset.view).toBe('plain');
    expect(document.documentElement.dataset.abPhase).toBeUndefined();
  });
});
