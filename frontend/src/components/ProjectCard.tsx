import { useState } from "react";
import { useProject } from "../api/hooks";
import type { Project } from "../api/types";
import { fallback } from "../fallback";

const STATUS_LABEL = { live: "live", wip: "in progress", archived: "archived" } as const;

function ProjectDetails({ slug }: { slug: string }) {
  const { data } = useProject(slug, true);
  // Live write-up when the API answers; otherwise the copy bundled at build time.
  const body = data?.body_md || fallback.details[slug];
  if (!body) return null;
  return <p className="mt-4 border-t-2 border-rule pt-4 whitespace-pre-wrap">{body}</p>;
}

export function ProjectCard({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const hasDetails = Boolean(fallback.details[project.slug]);
  const links = [
    ["code", project.repo_url],
    ["live", project.live_url],
  ].filter((l): l is [string, string] => Boolean(l[1]));

  return (
    <article className="flex flex-col gap-3 border-2 border-ink p-5 [overflow-wrap:anywhere]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-extrabold leading-tight">
          <span className="text-muted plain:hidden" aria-hidden="true">
            ├─{" "}
          </span>
          {project.name}
        </h3>
        <span className="shrink-0 border-2 border-ink px-2 text-sm">{STATUS_LABEL[project.status]}</span>
      </div>
      <p>{project.summary}</p>
      {project.stack.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm" aria-label="Stack">
          {project.stack.map((s) => (
            <li key={s} className="border border-rule px-2">
              {s}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-4 pt-2 text-sm">
        {project.started_on && <span className="text-muted">{project.started_on.slice(0, 4)}</span>}
        {links.map(([label, url]) => (
          <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            {label} ↗
          </a>
        ))}
        {hasDetails && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="underline underline-offset-4"
          >
            Details
          </button>
        )}
      </div>
      {open && <ProjectDetails slug={project.slug} />}
    </article>
  );
}
