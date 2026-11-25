import { useState } from "react";
import { useProjects, useTags } from "../api/hooks";
import { ProjectCard } from "../components/ProjectCard";
import { Section } from "../components/Section";
import { TagChips } from "../components/TagChips";

export function Projects() {
  const [selected, setSelected] = useState<string[]>([]);
  const { data: tags } = useTags();
  const { data, source } = useProjects(selected);

  const toggle = (label: string) =>
    setSelected((cur) =>
      cur.some((s) => s.toLowerCase() === label.toLowerCase())
        ? cur.filter((s) => s.toLowerCase() !== label.toLowerCase())
        : [...cur, label],
    );

  return (
    <Section id="projects" command="ls projects/">
      <TagChips tags={tags} selected={selected} onToggle={toggle} onClear={() => setSelected([])} />
      <p className="mb-6 text-sm text-muted" aria-live="polite">
        ({data.count} rows) · {source === "live" ? `${data.elapsed_ms} ms` : "offline copy"}
      </p>
      <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        {data.rows.map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
      </div>
    </Section>
  );
}
