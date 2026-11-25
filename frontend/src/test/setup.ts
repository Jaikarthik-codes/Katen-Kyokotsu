import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { stubCanvas } from "./canvas";

beforeEach(() => {
  stubCanvas();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
