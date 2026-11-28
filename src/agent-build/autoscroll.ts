import { CONFIG } from './config';
import { clamp } from './math';

export interface ScrollInput {
  /** Seconds since the build started (already multiplied by the speed). */
  elapsed: number;
  /** Seconds the whole build should take. */
  target: number;
  scrollY: number;
  maxScroll: number;
  /** Unbuilt layers inside the dispatch window. */
  pendingInView: number;
}

/** Auto-scroll speed in px/s, paced to reach the bottom around the target time. */
export function scrollVelocity(input: ScrollInput): number {
  if (input.elapsed < CONFIG.scrollWait) return 0;
  if (input.pendingInView >= CONFIG.scrollPauseAt) return 0;
  const distance = input.maxScroll - input.scrollY;
  if (distance <= 0.5) return 0;
  const timeLeft = Math.max(input.target - input.elapsed, 1);
  return clamp(distance / timeLeft, CONFIG.scrollMin, CONFIG.scrollMax);
}
