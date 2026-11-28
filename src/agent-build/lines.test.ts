import { describe, expect, it } from 'vitest';
import { mergeLineRects, penPoint, revealPolygon } from './lines';

describe('mergeLineRects', () => {
  it('keeps a single line', () => {
    expect(mergeLineRects([{ x: 0, y: 0, w: 120, h: 20 }])).toEqual([
      { x: 0, y: 0, w: 120, h: 20 },
    ]);
  });

  it('merges inline spans on the same line', () => {
    const rects = [
      { x: 0, y: 0, w: 50, h: 20 },
      { x: 50, y: 0, w: 30, h: 20 },
      { x: 80, y: 0, w: 40, h: 20 },
    ];
    expect(mergeLineRects(rects)).toEqual([{ x: 0, y: 0, w: 120, h: 20 }]);
  });

  it('splits two lines and sorts them top to bottom', () => {
    const rects = [
      { x: 0, y: 24, w: 60, h: 20 },
      { x: 0, y: 0, w: 120, h: 20 },
    ];
    expect(mergeLineRects(rects)).toEqual([
      { x: 0, y: 0, w: 120, h: 20 },
      { x: 0, y: 24, w: 60, h: 20 },
    ]);
  });

  it('merges a taller, baseline-offset span (like inline code) into its line', () => {
    const rects = [
      { x: 0, y: 2, w: 40, h: 20 },
      { x: 40, y: 1, w: 30, h: 22 },
      { x: 70, y: 2, w: 20, h: 20 },
    ];
    expect(mergeLineRects(rects)).toEqual([{ x: 0, y: 1, w: 90, h: 22 }]);
  });

  it('drops zero-width rects', () => {
    const rects = [
      { x: 0, y: 0, w: 0, h: 20 },
      { x: 0, y: 24, w: 60, h: 20 },
    ];
    expect(mergeLineRects(rects)).toEqual([{ x: 0, y: 24, w: 60, h: 20 }]);
  });
});

// Two lines: 100 px then 60 px, so 160 px of text in total.
const LINES = [
  { x: 0, y: 0, w: 100, h: 20 },
  { x: 0, y: 24, w: 60, h: 20 },
];

describe('revealPolygon', () => {
  it('shows none of the text at the start', () => {
    expect(revealPolygon(LINES, 0, 100)).toBe(
      'polygon(0px 0px, 100px 0px, 100px 0px, 0px 0px, 0px 20px, 0px 20px)',
    );
  });

  it('shows the first line and part of the second in the middle', () => {
    // 0.8 × 160 = 128 px: the first line (100 px) plus 28 px of the second.
    expect(revealPolygon(LINES, 0.8, 100)).toBe(
      'polygon(0px 0px, 100px 0px, 100px 24px, 28px 24px, 28px 44px, 0px 44px)',
    );
  });

  it('removes the clip when done', () => {
    expect(revealPolygon(LINES, 1, 100)).toBe('none');
  });

  it('does not clip text that has no lines', () => {
    expect(revealPolygon([], 0.5, 100)).toBe('none');
  });
});

describe('penPoint', () => {
  it('starts at the beginning of the first line', () => {
    expect(penPoint(LINES, 0)).toEqual({ x: 0, y: 10 });
  });

  it('sits on the revealed edge of the current line, vertically centred', () => {
    expect(penPoint(LINES, 0.8)).toEqual({ x: 28, y: 34 });
  });

  it('ends at the end of the last line', () => {
    expect(penPoint(LINES, 1)).toEqual({ x: 60, y: 34 });
  });
});
