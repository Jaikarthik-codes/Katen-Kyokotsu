const SECTIONS = [
  { id: "whoami", command: "whoami" },
  { id: "projects", command: "ls projects/" },
  { id: "skills", command: "cat skills.txt" },
  { id: "history", command: "history" },
  { id: "contact", command: "contact" },
] as const;

export function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <header className="border-b-2 border-ink px-[max(5vw,16px)] py-4" />
      <main id="main" className="px-[max(5vw,16px)]">
        {SECTIONS.map(({ id, command }) => (
          <section key={id} id={id} aria-labelledby={`${id}-prompt`} className="py-12">
            <p id={`${id}-prompt`} role="heading" aria-level={2} className="font-semibold">
              $ {command}
            </p>
          </section>
        ))}
      </main>
      <footer className="border-t-2 border-ink px-[max(5vw,16px)] py-8" />
    </>
  );
}
