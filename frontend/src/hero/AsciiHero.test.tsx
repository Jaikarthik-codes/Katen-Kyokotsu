import { act, render } from "@testing-library/react";
import { canvasFillTextCalls, mockMatchMedia } from "../test/canvas";
import { AsciiHero } from "./AsciiHero";
import { renderFrame } from "./knot";

vi.mock("./knot", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./knot")>();
  return { ...mod, renderFrame: vi.fn(mod.renderFrame) };
});

it("uses the small knot on low-tier devices", () => {
  vi.spyOn(navigator, "hardwareConcurrency", "get").mockReturnValue(2);
  render(<AsciiHero />);
  expect(document.querySelector("canvas")).toHaveAttribute("data-samples", "8000");
});

it("draws one static frame and starts no loop under reduced motion", () => {
  mockMatchMedia({ "(prefers-reduced-motion: reduce)": true });
  const raf = vi.spyOn(window, "requestAnimationFrame");
  render(<AsciiHero />);
  expect(raf).not.toHaveBeenCalled();
  expect(canvasFillTextCalls()).toBeGreaterThan(0);
});

it("keeps rotating from the same angle when quality drops", () => {
  const pending = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    pending.set(nextId, cb);
    return nextId++;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => pending.delete(id));
  const runFrame = (now: number) => {
    const cbs = [...pending.values()];
    pending.clear();
    act(() => cbs.forEach((cb) => cb(now)));
  };

  render(<AsciiHero />);
  const canvas = document.querySelector("canvas")!;
  const full = canvas.getAttribute("data-samples");
  let t = 0;
  for (let i = 0; i < 100 && canvas.getAttribute("data-samples") === full; i++) runFrame((t += 50)); // 20 fps
  expect(canvas.getAttribute("data-samples")).not.toBe(full);

  runFrame((t += 50)); // first frame at the lower quality
  const angleA = vi.mocked(renderFrame).mock.calls.at(-1)![1];
  expect(angleA).toBeGreaterThan(0.9); // ~40 frames in, not back at the 0.6 start
});
