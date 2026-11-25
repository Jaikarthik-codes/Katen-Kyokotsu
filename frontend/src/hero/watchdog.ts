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
  let frames = 0;
  let fired = false;
  return {
    tick(now) {
      if (fired) return;
      if (start < 0) {
        start = now;
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
