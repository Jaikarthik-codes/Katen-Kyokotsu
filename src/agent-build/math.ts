/** Small, pure helpers for time-based motion. */

export function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value;
}

/**
 * Moves `current` toward `target`, closing 1 - e^(-k·dt) of the gap.
 * Because the fraction depends on elapsed time (not on frame count), motion
 * looks the same at 60 Hz and 120 Hz.
 */
export function approach(current: number, target: number, k: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-k * dt));
}

/** Frame time in seconds, capped so one slow frame can never cause a jump. */
export function capDt(ms: number, maxMs = 50): number {
  return clamp(ms, 0, maxMs) / 1000;
}

export function easeOutCubic(t: number): number {
  const rest = 1 - clamp(t, 0, 1);
  return 1 - rest * rest * rest;
}
