/** A gap this long between frames means the loop was paused (off screen, hidden tab), not slow. */
const PAUSE_MS = 500;

/** Calls onSlow once if the frame rate stays below minFps over a full window. */
export function createWatchdog({
  minFps,
  windowMs,
  onSlow,
}: {
  minFps: number;
  windowMs: number;
  onSlow: () => void;
}): { tick(now: number): void } {
  let start = -1;
  let last = -1;
  let frames = 0;
  let fired = false;
  return {
    tick(now) {
      if (fired) return;
      const paused = last >= 0 && now - last > PAUSE_MS;
      last = now;
      if (start < 0 || paused) {
        start = now; // (re)start the measuring window
        frames = 0;
        return;
      }
      frames++;
      const elapsed = now - start;
      if (elapsed < windowMs) return;
      if ((frames * 1000) / elapsed < minFps) {
        fired = true;
        onSlow();
      } else {
        start = now;
        frames = 0;
      }
    },
  };
}
