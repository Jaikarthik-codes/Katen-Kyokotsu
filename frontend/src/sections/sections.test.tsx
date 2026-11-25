import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
import { ProjectCard } from "../components/ProjectCard";
import { fallback } from "../fallback";
import { lastFetchUrl, projectsFor, setFallbackDetails, stubFetchRouter } from "../test/fetch";
import { renderWithQuery } from "../test/render";
import { Projects } from "./Projects";

it("filters projects when a tag chip is pressed", async () => {
  stubFetchRouter({ "/api/v1/tags": [{ label: "FastAPI", count: 1 }], "/api/v1/projects": (url: URL) => projectsFor(url) });
  renderWithQuery(<Projects />);
  await userEvent.click(await screen.findByRole("button", { name: "FastAPI" }));
  expect(screen.getByRole("button", { name: "FastAPI" })).toHaveAttribute("aria-pressed", "true");
  await waitFor(() => expect(lastFetchUrl()).toContain("tag=FastAPI"));
});

it("never prints null or dead links for missing optionals", () => {
  const p = { ...fallback.projects[0], repo_url: null, live_url: null, started_on: null, stack: [] };
  render(<ProjectCard project={p} />);
  expect(document.body.textContent).not.toMatch(/null|undefined/);
  expect(screen.queryByRole("link")).toBeNull();
});

it("expands project details only when a write-up exists", async () => {
  stubFetchRouter({});
  const p = { ...fallback.projects[0], slug: "with-notes" };
  setFallbackDetails({ "with-notes": "Line one\nLine two" });
  renderWithQuery(<ProjectCard project={p} />);
  await userEvent.click(screen.getByRole("button", { name: "Details" }));
  expect(screen.getByText(/Line one/)).toBeInTheDocument();
});

it("shows offline copy in the status line when cached", () => {
  stubFetchRouter({});
  renderWithQuery(<Projects />);
  expect(screen.getByText(/offline copy/)).toBeInTheDocument();
});

it("renders the profile name as the only h1", () => {
  stubFetchRouter({});
  renderWithQuery(<App />);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(fallback.profile.name);
});
