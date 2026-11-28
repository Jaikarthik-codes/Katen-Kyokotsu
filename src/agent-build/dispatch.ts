/** A point in viewport coordinates (an agent, or where a job starts). */
export interface Spot {
  id: number;
  x: number;
  y: number;
}

/** A layer's vertical extent in document coordinates. */
export interface Span {
  id: number;
  y: number;
  h: number;
}

/**
 * Ready jobs worth handing out this pass: the ones inside the window first
 * (document order), then ones the auto-scroll already left behind above it
 * (nearest first) so they still get built. Layers below the window wait.
 */
export function pickWindow(
  layers: readonly Span[],
  isReady: (id: number) => boolean,
  viewTop: number,
  viewBottom: number,
  limit: number,
): number[] {
  const picked: number[] = [];
  const above: Span[] = [];
  for (const layer of layers) {
    if (!isReady(layer.id)) continue;
    if (layer.y < viewBottom && layer.y + layer.h > viewTop) {
      if (picked.length < limit) picked.push(layer.id);
    } else if (layer.y + layer.h <= viewTop) {
      above.push(layer);
    }
  }
  if (picked.length >= limit) return picked;
  above.sort((a, b) => b.y + b.h - (a.y + a.h));
  for (const layer of above) {
    if (picked.length >= limit) break;
    picked.push(layer.id);
  }
  return picked;
}

/** Greedy assignment: each job, in order, goes to the nearest agent still free. */
export function assignNearest(
  jobs: readonly Spot[],
  agents: readonly Spot[],
): Array<{ job: number; agent: number }> {
  const free = agents.slice();
  const assigned: Array<{ job: number; agent: number }> = [];
  for (const job of jobs) {
    if (free.length === 0) break;
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < free.length; i++) {
      const agent = free[i]!;
      const dx = agent.x - job.x;
      const dy = agent.y - job.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    assigned.push({ job: job.id, agent: free[best]!.id });
    free.splice(best, 1);
  }
  return assigned;
}

/** Unbuilt layers inside the window: auto-scroll waits when this gets high. */
export function pendingInWindow(
  layers: readonly Span[],
  isDone: (id: number) => boolean,
  viewTop: number,
  viewBottom: number,
): number {
  let pending = 0;
  for (const layer of layers) {
    if (!isDone(layer.id) && layer.y < viewBottom && layer.y + layer.h > viewTop) pending++;
  }
  return pending;
}
