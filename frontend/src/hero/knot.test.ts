import { buildKnot, renderFrame } from "./knot";

it("renders a frame of the right size with content near the centre", () => {
  const f = renderFrame(buildKnot(320, 16), 0.6, 0, 80, 40, 2);
  expect(f.text).toHaveLength(40);
  expect(f.text.every((r) => r.length === 80)).toBe(true);
  const filled = f.text
    .flatMap((r, y) => [...r].map((c, x) => (c !== " " ? [x, y] : null)))
    .filter(Boolean) as number[][];
  expect(filled.length).toBeGreaterThan(300);
  const cx = filled.reduce((s, p) => s + p[0], 0) / filled.length;
  expect(Math.abs(cx - 40)).toBeLessThan(8);
});

it("puts only the two brightest ramp characters in hot", () => {
  const f = renderFrame(buildKnot(320, 16), 0.6, 0, 80, 40, 2);
  expect(f.hot.join("").replace(/[ ]/g, "")).toMatch(/^[$@]*$/);
  expect(f.text.join("")).not.toMatch(/[$@]/);
});
