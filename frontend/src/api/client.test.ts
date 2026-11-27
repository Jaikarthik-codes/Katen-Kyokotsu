import { resolveApiBase } from "./client";

it("uses the configured API URL, without a trailing slash", () => {
  expect(resolveApiBase("https://api.example.com/", false)).toBe("https://api.example.com");
  expect(resolveApiBase("http://localhost:8000", true)).toBe("http://localhost:8000");
});

it("falls back to the local API only in development", () => {
  expect(resolveApiBase(undefined, true)).toBe("http://localhost:8000");
  expect(resolveApiBase("  ", true)).toBe("http://localhost:8000");
});

it("has no API in a production build without VITE_API_URL", () => {
  // A deployed site must never call the visitor's own machine.
  expect(resolveApiBase(undefined, false)).toBeNull();
  expect(resolveApiBase("", false)).toBeNull();
});

it("rejects without any network request when no API is configured", async () => {
  vi.resetModules();
  vi.stubEnv("VITE_API_URL", "");
  vi.stubEnv("DEV", false);
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { apiGet } = await import("./client");
  await expect(apiGet("/healthz")).rejects.toMatchObject({ code: "no_api" });
  expect(fetchMock).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
});
