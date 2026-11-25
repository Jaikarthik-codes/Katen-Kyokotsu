import type { FallbackData, Project, ProjectList, Tag } from "../api/types";
import data from "./data.json";

/** Seed content bundled at build time (see scripts/build-fallback.mjs). */
export const fallback = data as unknown as FallbackData;

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  for (const t of tags) {
    const key = t.trim().toLowerCase();
    if (key) seen.add(key);
  }
  return [...seen];
}

/** Same rules as GET /api/v1/projects: AND filter, case-insensitive, order preserved. */
export function filterProjects(projects: Project[], tags: string[]): ProjectList {
  const wanted = normalizeTags(tags);
  const rows = projects.filter((p) => {
    const stack = new Set(p.stack.map((s) => s.toLowerCase()));
    return wanted.every((t) => stack.has(t));
  });
  return { rows, count: rows.length, elapsed_ms: 0 };
}

/** Same as GET /api/v1/tags: most used first, then alphabetical. */
export function tagCounts(projects: Project[]): Tag[] {
  const counts = new Map<string, number>();
  for (const p of projects) for (const label of p.stack) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
