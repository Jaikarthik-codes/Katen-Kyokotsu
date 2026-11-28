import { describe, expect, it } from 'vitest';
import { approach, capDt, clamp, easeOutCubic } from './math';

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('approach', () => {
  it('closes 1 - e^(-k·dt) of the gap', () => {
    // 1 - e^(-15 × 0.016) = 1 - e^-0.24 = 0.213372...
    expect(approach(0, 100, 15, 0.016)).toBeCloseTo(21.337, 2);
  });

  it('does not move when no time passed', () => {
    expect(approach(40, 100, 15, 0)).toBe(40);
  });

  it('is frame-rate independent', () => {
    // Two 8 ms frames (120 Hz) must land where one 16 ms frame (60 Hz) lands.
    const twoSmall = approach(approach(0, 100, 15, 0.008), 100, 15, 0.008);
    const oneBig = approach(0, 100, 15, 0.016);
    expect(Math.abs(twoSmall - oneBig)).toBeLessThan(1e-9);
  });
});

describe('capDt', () => {
  it('converts milliseconds to seconds', () => {
    expect(capDt(16)).toBeCloseTo(0.016, 9);
  });

  it('caps at 50 ms', () => {
    expect(capDt(400)).toBe(0.05);
  });

  it('never goes negative', () => {
    expect(capDt(-5)).toBe(0);
  });
});

describe('easeOutCubic', () => {
  it('starts at 0, ends at 1 and is past halfway at the midpoint', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 9);
  });
});
