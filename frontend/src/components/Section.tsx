import type { ReactNode } from "react";
import { Prompt } from "./Prompt";

export function Section({ id, command, children }: { id: string; command: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-prompt`} className="border-t-2 border-ink py-14 first:border-t-0">
      <div className="mx-auto max-w-[1240px]">
        <Prompt id={`${id}-prompt`} command={command} />
        {children}
      </div>
    </section>
  );
}
