import { describe, expect, it } from 'vitest';
import { frameAt, jobSeconds } from './jobs';

describe('jobSeconds', () => {
  it('times text with clamp(0.24 + 0.014 × chars, 0.3, 1.5)', () => {
    expect(jobSeconds('text', 0, 0, 0)).toBeCloseTo(0.3, 9);
    expect(jobSeconds('text', 10, 0, 0)).toBeCloseTo(0.38, 9);
    expect(jobSeconds('text', 50, 0, 0)).toBeCloseTo(0.94, 9);
    expect(jobSeconds('text', 200, 0, 0)).toBeCloseTo(1.5, 9);
  });

  it('finishes icons almost at once', () => {
    expect(jobSeconds('icon', 0, 24, 24)).toBe(0.16);
  });

  it('gives bigger boxes more time, within 0.35–0.85 s', () => {
    expect(jobSeconds('box', 0, 160, 44)).toBeCloseTo(0.388, 9); // 0.32 + 204 / 3000
    expect(jobSeconds('box', 0, 10, 10)).toBeCloseTo(0.35, 9);
    expect(jobSeconds('media', 0, 1200, 900)).toBeCloseTo(0.85, 9);
  });
});

describe('frameAt', () => {
  it('grows from nothing to full size with ease-out', () => {
    expect(frameAt(0, 200, 100)).toEqual({ w: 0, h: 0 });
    expect(frameAt(0.5, 200, 100)).toEqual({ w: 175, h: 87.5 });
    expect(frameAt(1, 200, 100)).toEqual({ w: 200, h: 100 });
  });

  it('stays at full size after the end', () => {
    expect(frameAt(1.4, 200, 100)).toEqual({ w: 200, h: 100 });
  });
});
