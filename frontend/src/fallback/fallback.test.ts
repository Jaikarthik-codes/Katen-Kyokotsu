import type { Project } from "../api/types";
import { fallback, filterProjects, tagCounts } from "./index";

const P = (slug: string, stack: string[], featured = false) =>
  ({
    slug,
    name: slug,
    summary: "s",
    stack,
    status: "wip",
    repo_url: null,
    live_url: null,
    started_on: null,
    featured,
  }) as Project;
const projects = [P("a", ["FastAPI", "PostgreSQL"], true), P("b", ["FastAPI", "React"]), P("c", ["Python"])];

it("filters with AND, ignoring case, whitespace and duplicates", () => {
  expect(filterProjects(projects, [" fastapi ", "FASTAPI", "react"]).rows.map((p) => p.slug)).toEqual(["b"]);
});

it("returns everything in input order for no tags", () => {
  const list = filterProjects(projects, []);
  expect(list.count).toBe(3);
  expect(list.rows.map((p) => p.slug)).toEqual(["a", "b", "c"]);
  expect(list.elapsed_ms).toBe(0);
});

it("counts tags like the API", () => {
  expect(tagCounts(projects)[0]).toEqual({ label: "FastAPI", count: 2 });
});

it("bundles real seed content", () => {
  expect(fallback.profile.name.length).toBeGreaterThan(0);
  expect(fallback.projects.some((p) => p.slug === "portfolio")).toBe(true);
});
