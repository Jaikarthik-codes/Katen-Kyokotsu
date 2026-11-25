import { useExperience } from "../api/hooks";
import { Section } from "../components/Section";

const year = (d: string) => d.slice(0, 4);

export function History() {
  const { data: rows } = useExperience();
  return (
    <Section id="history" command="history">
      <ol className="grid gap-6">
        {rows.map((e) => (
          <li key={`${e.kind}-${e.org}-${e.title}-${e.start}`} className="grid gap-1 md:grid-cols-[10em_minmax(0,1fr)]">
            <span className="text-muted">
              {year(e.start)}–{e.end ? year(e.end) : "present"}
            </span>
            <div className="[overflow-wrap:anywhere]">
              <p className="font-semibold">
                {e.title} · {e.org}
              </p>
              {e.highlights.length > 0 && (
                <ul className="mt-1 list-['–_'] pl-5">
                  {e.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
