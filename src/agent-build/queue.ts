export type JobState = 'blocked' | 'ready' | 'running' | 'done';

export interface QueueCounts {
  blocked: number;
  ready: number;
  running: number;
  done: number;
}

/**
 * The build's job queue. Each layer is one job; a job whose parent layer is
 * not built yet stays blocked (a card is drawn before its text), the same
 * idea as a task that depends on another task in Celery or Airflow.
 */
export class JobQueue {
  private readonly states: JobState[];
  private readonly children: number[][];
  private readonly tally: QueueCounts = { blocked: 0, ready: 0, running: 0, done: 0 };

  constructor(parents: readonly number[]) {
    this.children = parents.map(() => []);
    this.states = parents.map((parent, id) => {
      if (parent === -1) return 'ready';
      if (!Number.isInteger(parent) || parent < 0 || parent >= id) {
        throw new RangeError(
          `Layer ${id} has parent ${parent}; a parent must come before its child.`,
        );
      }
      this.children[parent]!.push(id);
      return 'blocked';
    });
    for (const s of this.states) this.tally[s]++;
  }

  get size(): number {
    return this.states.length;
  }

  get allDone(): boolean {
    return this.tally.done === this.states.length;
  }

  state(id: number): JobState {
    const s = this.states[id];
    if (s === undefined) throw new RangeError(`No job ${id}`);
    return s;
  }

  start(id: number): void {
    if (this.state(id) !== 'ready') throw new Error(`Job ${id} is ${this.state(id)}, not ready`);
    this.move(id, 'running');
  }

  /** Marks a running job done and returns the children it unblocked. */
  finish(id: number): number[] {
    if (this.state(id) !== 'running')
      throw new Error(`Job ${id} is ${this.state(id)}, not running`);
    this.move(id, 'done');
    const woken: number[] = [];
    for (const child of this.children[id]!) {
      if (this.states[child] === 'blocked') {
        this.move(child, 'ready');
        woken.push(child);
      }
    }
    return woken;
  }

  finishAll(): void {
    this.states.fill('done');
    this.tally.blocked = this.tally.ready = this.tally.running = 0;
    this.tally.done = this.states.length;
  }

  counts(): QueueCounts {
    return { ...this.tally };
  }

  private move(id: number, next: JobState): void {
    this.tally[this.states[id]!]--;
    this.tally[next]++;
    this.states[id] = next;
  }
}
