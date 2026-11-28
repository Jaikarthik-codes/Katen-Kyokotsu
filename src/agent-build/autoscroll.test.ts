import { describe, expect, it } from 'vitest';
import { scrollVelocity } from './autoscroll';

const BASE = { elapsed: 10, target: 30, scrollY: 0, maxScroll: 4000, pendingInView: 0 };

describe('scrollVelocity', () => {
  it('waits for the first 2.4 s', () => {
    expect(scrollVelocity({ ...BASE, elapsed: 2.3 })).toBe(0);
    expect(scrollVelocity({ ...BASE, elapsed: 2.5 })).toBeGreaterThan(0);
  });

  it('pauses while 15 or more layers are pending', () => {
    expect(scrollVelocity({ ...BASE, pendingInView: 15 })).toBe(0);
    expect(scrollVelocity({ ...BASE, pendingInView: 14 })).toBeGreaterThan(0);
  });

  it('spreads the remaining distance over the remaining time', () => {
    expect(scrollVelocity(BASE)).toBe(200); // 4000 px over 20 s
  });

  it('clamps to 60–1500 px/s', () => {
    expect(scrollVelocity({ ...BASE, maxScroll: 100 })).toBe(60);
    expect(scrollVelocity({ ...BASE, maxScroll: 100_000 })).toBe(1500);
  });

  it('keeps going at full speed once the target time has passed', () => {
    expect(scrollVelocity({ ...BASE, elapsed: 40 })).toBe(1500);
  });

  it('returns 0 at the bottom', () => {
    expect(scrollVelocity({ ...BASE, scrollY: 4000 })).toBe(0);
  });
});
