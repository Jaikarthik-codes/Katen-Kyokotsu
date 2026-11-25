import { Header } from "./components/Header";
import { fallback } from "./fallback";
import { Contact } from "./sections/Contact";
import { History } from "./sections/History";
import { Projects } from "./sections/Projects";
import { Skills } from "./sections/Skills";
import { Whoami } from "./sections/Whoami";

export function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="px-[max(5vw,16px)]">
        <Whoami />
        <Projects />
        <Skills />
        <History />
        <Contact />
      </main>
      <footer className="border-t-2 border-ink px-[max(5vw,16px)] py-8 text-sm text-muted">
        <div className="mx-auto max-w-[1240px]">
          © {new Date().getFullYear()} {fallback.profile.name} · built with FastAPI, PostgreSQL and React
        </div>
      </footer>
    </>
  );
}
