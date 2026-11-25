import type { Tag } from "../api/types";

export function TagChips({
  tags,
  selected,
  onToggle,
  onClear,
}: {
  tags: Tag[];
  selected: string[];
  onToggle: (label: string) => void;
  onClear: () => void;
}) {
  const isOn = (label: string) => selected.some((s) => s.toLowerCase() === label.toLowerCase());
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by tag">
      {tags.map((t) => (
        <button
          key={t.label}
          type="button"
          aria-pressed={isOn(t.label)}
          onClick={() => onToggle(t.label)}
          className="border-2 border-ink px-3 py-1 text-sm aria-pressed:bg-ink aria-pressed:text-paper"
        >
          {t.label}
        </button>
      ))}
      {selected.length > 0 && (
        <button type="button" onClick={onClear} className="px-2 py-1 text-sm underline underline-offset-4">
          clear
        </button>
      )}
    </div>
  );
}
