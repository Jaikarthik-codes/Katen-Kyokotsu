// Turns seed/*.yaml into src/fallback/data.json so the site renders instantly,
// even before (or without) the API. Output matches the API's shapes and ordering.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const seedDir = resolve(process.env.SEED_DIR ?? resolve(here, "../../seed"));
const outFile = resolve(here, "../src/fallback/data.json");

function fail(message) {
  console.error(`build-fallback: ${message}`);
  process.exit(1);
}

function load(name) {
  const path = resolve(seedDir, name);
  if (!existsSync(path)) fail(`missing ${path}`);
  return YAML.parse(readFileSync(path, "utf8")) ?? (name === "profile.yaml" ? {} : []);
}

const profileRaw = load("profile.yaml");
for (const key of ["name", "headline", "intro", "email"]) {
  if (typeof profileRaw[key] !== "string" || !profileRaw[key].trim()) fail(`profile.yaml: "${key}" is required`);
}
const profile = {
  name: profileRaw.name,
  headline: profileRaw.headline,
  intro: profileRaw.intro,
  email: profileRaw.email,
  github: profileRaw.github ?? null,
  linkedin: profileRaw.linkedin ?? null,
  resume_url: profileRaw.resume_url ?? null,
};

const details = {};
const projects = load("projects.yaml")
  .map((p) => {
    if (p.body_md && String(p.body_md).trim()) details[p.slug] = String(p.body_md);
    return {
      slug: p.slug,
      name: p.name,
      summary: p.summary,
      stack: p.stack ?? [],
      status: p.status,
      repo_url: p.repo_url ?? null,
      live_url: p.live_url ?? null,
      started_on: p.started_on ?? null,
      featured: p.featured ?? false,
      sort: p.sort_order ?? 0,
    };
  })
  // Same order as the API: featured desc, sort_order asc, started_on desc (nulls last).
  .sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) ||
      a.sort - b.sort ||
      (a.started_on === b.started_on ? 0 : a.started_on === null ? 1 : b.started_on === null ? -1 : b.started_on.localeCompare(a.started_on)),
  )
  .map(({ sort: _sort, ...p }) => p);

const skills = load("skills.yaml")
  .map((s) => ({ name: s.name, category: s.category, years: s.years ?? null, sort: s.sort_order ?? 0 }))
  .sort((a, b) => a.category.localeCompare(b.category) || a.sort - b.sort || a.name.localeCompare(b.name))
  .map(({ sort: _sort, ...s }) => s);

const experience = load("experience.yaml")
  .map((e) => ({
    kind: e.kind,
    org: e.org,
    title: e.title,
    start: e.start,
    end: e.end ?? null,
    highlights: e.highlights ?? [],
  }))
  .sort((a, b) => b.start.localeCompare(a.start));

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify({ profile, projects, details, skills, experience }, null, 2)}\n`);
console.log(
  `build-fallback: ${projects.length} projects, ${skills.length} skills, ${experience.length} experience -> src/fallback/data.json`,
);
