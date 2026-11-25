import { screen } from "@testing-library/react";
import { App } from "./App";
import { stubFetchRouter } from "./test/fetch";
import { renderWithQuery } from "./test/render";

it("renders the shell with a skip link and the five prompt sections", () => {
  stubFetchRouter({});
  renderWithQuery(<App />);
  expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
  for (const prompt of ["$ whoami", "$ ls projects/", "$ cat skills.txt", "$ history", "$ contact"]) {
    expect(screen.getByRole("heading", { name: prompt })).toBeInTheDocument();
  }
  expect(document.querySelector("main#main")).not.toBeNull();
});
