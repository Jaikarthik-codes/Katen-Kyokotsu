import { useQuery } from "@tanstack/react-query";
import { fallback, filterProjects, tagCounts } from "../fallback";
import { apiGet } from "./client";
import type { Experience, ProjectDetail, ProjectList, Skill, Tag } from "./types";

/** "cached" = the copy bundled at build time; "live" = answered by the API. */
export type Source = "live" | "cached";

export interface Cached<T> {
  data: T;
  source: Source;
}

/**
 * Start from bundled data (instant render, works offline), then replace it with the
 * API's answer. initialDataUpdatedAt: 0 marks the bundled copy as stale, so the API
 * is asked straight away; on failure the bundled copy simply stays.
 */
function useCachedQuery<T extends object>(
  key: readonly unknown[],
  path: string,
  initial: T,
  params?: Record<string, string | string[]>,
): Cached<T> {
  const q = useQuery({
    queryKey: key,
    queryFn: () => apiGet<T>(path, params),
    initialData: initial,
    initialDataUpdatedAt: 0,
  });
  return { data: q.data, source: q.dataUpdatedAt > 0 ? "live" : "cached" };
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Map<string, string>();
  for (const t of tags) {
    const trimmed = t.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) seen.set(trimmed.toLowerCase(), trimmed);
  }
  return [...seen.values()];
}

export function useProjects(tags: string[]): Cached<ProjectList> {
  const clean = uniqueTags(tags);
  const key = ["projects", clean.map((t) => t.toLowerCase()).sort()] as const;
  return useCachedQuery(key, "/api/v1/projects", filterProjects(fallback.projects, clean), { tag: clean });
}

export function useTags(): Cached<Tag[]> {
  return useCachedQuery(["tags"], "/api/v1/tags", tagCounts(fallback.projects));
}

export function useSkills(): Cached<Skill[]> {
  return useCachedQuery(["skills"], "/api/v1/skills", fallback.skills);
}

export function useExperience(): Cached<Experience[]> {
  return useCachedQuery(["experience"], "/api/v1/experience", fallback.experience);
}

export function useProject(slug: string, enabled: boolean): Cached<ProjectDetail | undefined> {
  const row = fallback.projects.find((p) => p.slug === slug);
  const initial = row ? { ...row, body_md: fallback.details[slug] ?? "" } : undefined;
  const q = useQuery({
    queryKey: ["project", slug],
    queryFn: () => apiGet<ProjectDetail>(`/api/v1/projects/${encodeURIComponent(slug)}`),
    initialData: initial,
    initialDataUpdatedAt: 0,
    enabled,
  });
  return { data: q.data, source: q.dataUpdatedAt > 0 ? "live" : "cached" };
}

/** Polls /healthz every 30 s. */
export function useApiStatus(): "online" | "offline" | "checking" {
  const q = useQuery({
    queryKey: ["healthz"],
    queryFn: () => apiGet<{ status: string }>("/healthz"),
    refetchInterval: 30_000,
    retry: false,
  });
  if (q.isSuccess) return "online";
  if (q.isError) return "offline";
  return "checking";
}
