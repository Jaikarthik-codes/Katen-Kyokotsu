// Mirrors backend/app/schemas.py. Keep the two in sync.

export type ProjectStatus = "live" | "wip" | "archived";

export interface Project {
  slug: string;
  name: string;
  summary: string;
  stack: string[];
  status: ProjectStatus;
  repo_url: string | null;
  live_url: string | null;
  started_on: string | null;
  featured: boolean;
}

export interface ProjectDetail extends Project {
  body_md: string;
}

export interface ProjectList {
  rows: Project[];
  count: number;
  elapsed_ms: number;
}

export interface Tag {
  label: string;
  count: number;
}

export interface Skill {
  name: string;
  category: string;
  years: number | null;
}

export interface Experience {
  kind: "education" | "work" | "training";
  org: string;
  title: string;
  start: string;
  end: string | null;
  highlights: string[];
}

export interface Profile {
  name: string;
  headline: string;
  intro: string;
  email: string;
  github: string | null;
  linkedin: string | null;
  resume_url: string | null;
}

export interface FallbackData {
  profile: Profile;
  projects: Project[];
  /** slug -> body_md, only for projects that have a write-up */
  details: Record<string, string>;
  skills: Skill[];
  experience: Experience[];
}
