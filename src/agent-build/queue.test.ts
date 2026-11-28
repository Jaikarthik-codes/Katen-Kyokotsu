import { describe, expect, it } from 'vitest';
import { JobQueue } from './queue';

// Layer 0 is a card with two children (1 and 2). Layer 3 stands alone.
const PARENTS = [-1, 0, 0, -1];

describe('JobQueue', () => {
  it('starts jobs without a parent ready and children blocked', () => {
    const q = new JobQueue(PARENTS);
    expect(q.size).toBe(4);
    expect([0, 1, 2, 3].map((id) => q.state(id))).toEqual(['ready', 'blocked', 'blocked', 'ready']);
  });

  it('child becomes ready only after parent finishes', () => {
    const q = new JobQueue(PARENTS);
    q.start(0);
    expect(q.state(1)).toBe('blocked');
    expect(q.finish(0)).toEqual([1, 2]);
    expect(q.state(1)).toBe('ready');
    expect(q.state(2)).toBe('ready');
  });

  it('refuses to start a job that is not ready', () => {
    const q = new JobQueue(PARENTS);
    expect(() => q.start(1)).toThrow();
    q.start(0);
    expect(() => q.start(0)).toThrow();
  });

  it('refuses to finish a job that is not running', () => {
    const q = new JobQueue(PARENTS);
    expect(() => q.finish(3)).toThrow();
  });

  it('counts every state', () => {
    const q = new JobQueue(PARENTS);
    q.start(0);
    expect(q.counts()).toEqual({ blocked: 2, ready: 1, running: 1, done: 0 });
    q.finish(0);
    expect(q.counts()).toEqual({ blocked: 0, ready: 3, running: 0, done: 1 });
  });

  it('finishAll marks everything done', () => {
    const q = new JobQueue(PARENTS);
    q.start(3);
    expect(q.allDone).toBe(false);
    q.finishAll();
    expect(q.allDone).toBe(true);
    expect(q.counts().done).toBe(4);
  });

  it('rejects a parent that does not come before its child', () => {
    expect(() => new JobQueue([1, -1])).toThrow();
    expect(() => new JobQueue([0])).toThrow();
  });
});
