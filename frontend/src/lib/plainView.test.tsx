import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
import { stubFetchRouter } from "../test/fetch";
import { renderWithQuery } from "../test/render";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.view;
});

it("toggles plain view, unmounts the hero and persists", async () => {
  stubFetchRouter({});
  renderWithQuery(<App />);
  expect(document.querySelector("canvas")).not.toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Plain view" }));
  expect(document.documentElement.dataset.view).toBe("plain");
  expect(document.querySelector("canvas")).toBeNull();
  expect(localStorage.getItem("plain-view")).toBe("1");
});

it("still works when localStorage throws", async () => {
  stubFetchRouter({});
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  renderWithQuery(<App />);
  await userEvent.click(screen.getByRole("button", { name: "Plain view" }));
  expect(document.documentElement.dataset.view).toBe("plain");
});
