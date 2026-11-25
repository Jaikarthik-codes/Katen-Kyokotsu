import { waitFor } from "@testing-library/react";
import { fallback } from "../fallback";
import { renderHookWithQuery } from "../test/render";
import { apiGet } from "./client";
import { useApiStatus, useProjects } from "./hooks";

it("shows cached data first, then live data", async () => {
  const live = { rows: [{ ...fallback.projects[0], name: "Live name" }], count: 1, elapsed_ms: 3.2 };
  let resolve!: (r: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((r) => (resolve = r))));
  const { result } = renderHookWithQuery(() => useProjects([]));
  expect(result.current.source).toBe("cached");
  expect(result.current.data.count).toBe(fallback.projects.length);
  resolve(new Response(JSON.stringify(live), { status: 200 }));
  await waitFor(() => expect(result.current.source).toBe("live"));
  expect(result.current.data.rows[0].name).toBe("Live name");
});

it("keeps cached data and reports offline when the API is down", async () => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
  const { result } = renderHookWithQuery(() => ({ p: useProjects([]), s: useApiStatus() }));
  await waitFor(() => expect(result.current.s).toBe("offline"));
  expect(result.current.p.source).toBe("cached");
  expect(result.current.p.data.rows.length).toBeGreaterThan(0);
});

it("sends repeated tag params and surfaces the envelope code", async () => {
  const f = vi.fn(
    async () =>
      new Response(JSON.stringify({ error: { code: "unknown_tag", message: "Unknown tag", details: [] } }), {
        status: 422,
      }),
  );
  vi.stubGlobal("fetch", f);
  await expect(apiGet("/api/v1/projects", { tag: ["FastAPI", "React"] })).rejects.toMatchObject({
    status: 422,
    code: "unknown_tag",
  });
  expect(String((f.mock.calls[0] as unknown[])[0])).toContain("tag=FastAPI&tag=React");
});
