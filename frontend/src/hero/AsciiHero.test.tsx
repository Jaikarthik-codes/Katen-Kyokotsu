import { render } from "@testing-library/react";
import { canvasFillTextCalls, mockMatchMedia } from "../test/canvas";
import { AsciiHero } from "./AsciiHero";

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
