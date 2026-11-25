import { render, screen } from "@testing-library/react";
import { App } from "./App";

it("renders the shell with a skip link and the five prompt sections", () => {
  render(<App />);
  expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
  for (const prompt of ["$ whoami", "$ ls projects/", "$ cat skills.txt", "$ history", "$ contact"]) {
    expect(screen.getByRole("heading", { name: prompt })).toBeInTheDocument();
  }
  expect(document.querySelector("main#main")).not.toBeNull();
});
