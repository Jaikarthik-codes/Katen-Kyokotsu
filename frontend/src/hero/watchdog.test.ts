import { createWatchdog } from "./watchdog";

it("fires onSlow once when fps stays under 45 for 2s", () => {
  const onSlow = vi.fn();
  const w = createWatchdog({ minFps: 45, windowMs: 2000, onSlow });
  for (let t = 0; t <= 4000; t += 50) w.tick(t); // 20 fps
  expect(onSlow).toHaveBeenCalledTimes(1);
});

it("does not fire at 60fps", () => {
  const onSlow = vi.fn();
  const w = createWatchdog({ minFps: 45, windowMs: 2000, onSlow });
  for (let t = 0; t <= 4000; t += 16.7) w.tick(t);
  expect(onSlow).not.toHaveBeenCalled();
});

it("does not treat a pause (off screen, hidden tab) as slow frames", () => {
  const onSlow = vi.fn();
  const w = createWatchdog({ minFps: 45, windowMs: 2000, onSlow });
  let t = 0;
  for (; t <= 1000; t += 16.7) w.tick(t); // 1 s at 60 fps
  t += 10_000; // paused for 10 s
  for (const end = t + 3000; t <= end; t += 16.7) w.tick(t); // 60 fps again
  expect(onSlow).not.toHaveBeenCalled();
});
