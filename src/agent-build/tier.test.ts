import { describe, expect, it } from 'vitest';
import { agentsFor, DESKTOP, isLayoutResize, pickTier, targetSecondsFor, TOUCH } from './tier';

describe('pickTier', () => {
  it('gives the desktop tier only to a fine pointer that can hover', () => {
    expect(pickTier(true, true).name).toBe('desktop');
    expect(pickTier(false, false).name).toBe('touch');
    expect(pickTier(true, false).name).toBe('touch');
  });

  it('turns extras on for desktop only', () => {
    expect(pickTier(true, true).extras).toBe(true);
    expect(pickTier(false, false).extras).toBe(false);
  });
});

describe('agentsFor', () => {
  it('grows linearly 18→30 on desktop', () => {
    expect(agentsFor(DESKTOP, 0)).toBe(18);
    expect(agentsFor(DESKTOP, 0.5)).toBe(24);
    expect(agentsFor(DESKTOP, 1)).toBe(30);
  });

  it('grows 8→14 on touch', () => {
    expect(agentsFor(TOUCH, 0)).toBe(8);
    expect(agentsFor(TOUCH, 1)).toBe(14);
  });

  it('never leaves the range', () => {
    expect(agentsFor(DESKTOP, 2)).toBe(30);
    expect(agentsFor(DESKTOP, -1)).toBe(18);
  });
});

describe('targetSecondsFor', () => {
  it('matches the reference length at 553 layers', () => {
    expect(targetSecondsFor(DESKTOP, 553)).toBe(44);
    expect(targetSecondsFor(TOUCH, 553)).toBe(26);
  });

  it('scales with the number of layers', () => {
    expect(targetSecondsFor(DESKTOP, 300)).toBeCloseTo(23.87, 2); // 300 × 44 / 553
    expect(targetSecondsFor(TOUCH, 300)).toBeCloseTo(14.105, 2); // 300 × 26 / 553
  });

  it('clamps to the tier minimum and maximum', () => {
    expect(targetSecondsFor(DESKTOP, 10)).toBe(12);
    expect(targetSecondsFor(TOUCH, 10)).toBe(8);
    expect(targetSecondsFor(DESKTOP, 5000)).toBe(44);
  });
});

describe('isLayoutResize', () => {
  it('ignores height-only changes', () => {
    // A phone's address bar showing or hiding changes only the height.
    expect(isLayoutResize(390, 390)).toBe(false);
    expect(isLayoutResize(390, 390.5)).toBe(false);
  });

  it('reports a width change', () => {
    expect(isLayoutResize(390, 844)).toBe(true);
  });
});
