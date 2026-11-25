import type { ReactNode } from "react";
import { useApiStatus } from "../api/hooks";
import { fallback } from "../fallback";

const NAV = [
  ["projects", "projects"],
  ["skills", "skills"],
  ["history", "history"],
  ["contact", "contact"],
] as const;

const STATUS = {
  online: "● online",
  offline: "○ offline copy",
  checking: "… connecting",
} as const;

export function Header({ actions }: { actions?: ReactNode }) {
  const status = useApiStatus();
  return (
    <header className="border-b-2 border-ink px-[max(5vw,16px)] py-3">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-2">
        <a href="#whoami" className="font-extrabold no-underline">
          {fallback.profile.name}
        </a>
        <nav aria-label="Sections" className="flex flex-wrap gap-x-4">
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="py-2 underline-offset-4 hover:underline">
              {label}
            </a>
          ))}
        </nav>
        <span className="ml-auto text-sm text-muted" aria-live="polite">
          {STATUS[status]}
        </span>
        {actions}
      </div>
    </header>
  );
}
