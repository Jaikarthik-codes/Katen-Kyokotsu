import { describe, expect, it } from 'vitest';
import { assignNearest, pendingInWindow, pickWindow } from './dispatch';

// Document positions in px. With a 1000 px viewport, 86 % gives an 860 px window.
const LAYERS = [
  { id: 0, y: 0, h: 40 },
  { id: 1, y: 100, h: 40 },
  { id: 2, y: 800, h: 40 },
  { id: 3, y: 950, h: 40 },
  { id: 4, y: 2000, h: 40 },
];
const always = () => true;

describe('pickWindow', () => {
  it('pickWindow respects 86 % window and 260 limit', () => {
    expect(pickWindow(LAYERS, always, 0, 860, 260)).toEqual([0, 1, 2]);
    expect(pickWindow(LAYERS, always, 0, 860, 2)).toEqual([0, 1]);
    const many = Array.from({ length: 300 }, (_, i) => ({ id: i, y: i, h: 1 }));
    expect(pickWindow(many, always, 0, 860, 260)).toHaveLength(260);
  });

  it('skips layers that are not ready', () => {
    expect(pickWindow(LAYERS, (id) => id !== 1, 0, 860, 260)).toEqual([0, 2]);
  });

  it('counts a layer cut by the top edge as inside', () => {
    const cut = [{ id: 7, y: 880, h: 40 }];
    expect(pickWindow(cut, always, 900, 1760, 260)).toEqual([7]);
  });

  it('pickWindow falls back to ready layers above the window', () => {
    // Scrolled to 900: layer 3 is inside; 2, 1 and 0 were left behind above, nearest first.
    expect(pickWindow(LAYERS, always, 900, 1760, 260)).toEqual([3, 2, 1, 0]);
  });

  it('never hands out layers below the window', () => {
    expect(pickWindow(LAYERS, always, 0, 860, 260)).not.toContain(4);
  });
});

describe('assignNearest', () => {
  it('assignNearest picks nearest free agent', () => {
    const jobs = [
      { id: 10, x: 0, y: 0 },
      { id: 11, x: 100, y: 0 },
    ];
    const agents = [
      { id: 1, x: 90, y: 0 },
      { id: 2, x: 5, y: 0 },
    ];
    expect(assignNearest(jobs, agents)).toEqual([
      { job: 10, agent: 2 },
      { job: 11, agent: 1 },
    ]);
  });

  it('gives each agent one job and stops when agents run out', () => {
    const jobs = [
      { id: 10, x: 0, y: 0 },
      { id: 11, x: 10, y: 0 },
      { id: 12, x: 20, y: 0 },
    ];
    expect(assignNearest(jobs, [{ id: 1, x: 15, y: 0 }])).toEqual([{ job: 10, agent: 1 }]);
  });

  it('returns nothing without free agents', () => {
    expect(assignNearest([{ id: 10, x: 0, y: 0 }], [])).toEqual([]);
  });
});

describe('pendingInWindow', () => {
  it('counts unbuilt layers inside the window', () => {
    expect(pendingInWindow(LAYERS, (id) => id === 0, 0, 860)).toBe(2);
  });
});
