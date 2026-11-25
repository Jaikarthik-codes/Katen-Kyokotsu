import type { ReactNode } from "react";
import { Section } from "../components/Section";
import { fallback } from "../fallback";

export function Whoami({ art }: { art?: ReactNode }) {
  const { profile } = fallback;
  return (
    <Section id="whoami" command="whoami">
      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <h1 className="text-[clamp(44px,7vw,96px)] font-extrabold leading-none tracking-tight [overflow-wrap:anywhere]">
            {profile.name}
          </h1>
          <p className="mt-5 text-xl font-semibold">{profile.headline}</p>
          <p className="mt-2 max-w-[34em] text-[17px]">{profile.intro}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#projects" className="border-2 border-ink bg-ink px-5 py-3 font-semibold text-paper hover:bg-signal hover:border-signal">
              See projects
            </a>
            {profile.resume_url && (
              <a href={profile.resume_url} className="border-2 border-ink px-5 py-3 font-semibold">
                Resume
              </a>
            )}
          </div>
        </div>
        {art && <div className="order-first md:order-last">{art}</div>}
      </div>
    </Section>
  );
}
