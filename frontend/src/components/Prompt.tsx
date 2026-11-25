/** A section header that reads like a shell prompt, e.g. "$ ls projects/". */
export function Prompt({ command, id }: { command: string; id: string }) {
  return (
    <p id={id} role="heading" aria-level={2} className="mb-6 text-lg font-semibold">
      <span className="text-signal">$</span> {command}
    </p>
  );
}
