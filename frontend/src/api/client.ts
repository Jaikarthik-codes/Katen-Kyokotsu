/**
 * Where the API lives. Development falls back to the local API; a production build
 * without VITE_API_URL has none (null), so a deployed site never calls the visitor's
 * own machine and simply shows the bundled copy.
 */
export function resolveApiBase(url: string | undefined, dev: boolean): string | null {
  const base = (url ?? "").trim().replace(/\/+$/, "");
  if (base) return base;
  return dev ? "http://localhost:8000" : null;
}

export const API_BASE = resolveApiBase(import.meta.env.VITE_API_URL, import.meta.env.DEV);
const TIMEOUT_MS = 4000;

/** A failed API call. `code` comes from the API's error envelope when there is one. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function apiGet<T>(path: string, params?: Record<string, string | string[]>): Promise<T> {
  if (API_BASE === null) throw new ApiError(0, "no_api", "No API is configured for this build");
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    for (const item of [value].flat()) url.searchParams.append(key, item);
  }
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    let code = "http_error";
    try {
      const body = (await res.json()) as { error?: { code?: string } };
      code = body.error?.code ?? code;
    } catch {
      // Not JSON (e.g. a proxy error page): keep the generic code.
    }
    throw new ApiError(res.status, code, `GET ${path} failed with ${res.status}`);
  }
  return (await res.json()) as T;
}
