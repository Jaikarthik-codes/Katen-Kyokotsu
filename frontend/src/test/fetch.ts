import { onTestFinished } from "vitest";
import { fallback, filterProjects } from "../fallback";

type Route = unknown | ((url: URL) => unknown);
let lastUrl = "";

/** Stub fetch with a tiny router keyed by pathname. Unknown paths reject like a dead network. */
export function stubFetchRouter(routes: Record<string, Route>) {
  lastUrl = "";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      lastUrl = url.toString();
      if (!(url.pathname in routes)) throw new TypeError("Failed to fetch");
      const route = routes[url.pathname];
      const body = typeof route === "function" ? (route as (u: URL) => unknown)(url) : route;
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  );
}

export const lastFetchUrl = () => lastUrl;

/** What the API would answer for /api/v1/projects?tag=... (same rules as the fallback filter). */
export const projectsFor = (url: URL) => filterProjects(fallback.projects, url.searchParams.getAll("tag"));

/** Temporarily replace the bundled project write-ups for one test. */
export function setFallbackDetails(details: Record<string, string>) {
  const previous = fallback.details;
  fallback.details = details;
  onTestFinished(() => {
    fallback.details = previous;
  });
}
