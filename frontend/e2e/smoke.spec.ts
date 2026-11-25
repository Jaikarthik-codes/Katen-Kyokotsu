import { expect, test } from "@playwright/test";

const noSidewaysScroll = () => document.documentElement.scrollWidth <= document.documentElement.clientWidth;

test("live data, tag filter and hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("● online")).toBeVisible();
  await expect(page.getByText(/rows\) · [\d.]+ ms/)).toBeVisible();
  await expect(page.locator("canvas[data-samples]")).toBeVisible();
  await page.getByRole("button", { name: "FastAPI" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  expect(await page.evaluate(noSidewaysScroll)).toBe(true);
});

test("offline copy when the API is unreachable", async ({ page }) => {
  await page.route("**/api/v1/**", (r) => r.abort());
  await page.route("**/healthz", (r) => r.abort());
  await page.goto("/");
  await expect(page.getByText("○ offline copy")).toBeVisible();
  await expect(page.getByRole("article").first()).toBeVisible();
});

test("long names and tags wrap at phone width", async ({ page }) => {
  const long = "Supercalifragilisticexpialidocious-distributed-event-sourcing-pipeline";
  await page.route("**/api/v1/projects*", (r) =>
    r.fulfill({
      json: {
        rows: [
          {
            slug: "x",
            name: long,
            summary: `${long} ${long}`,
            stack: [long],
            status: "wip",
            repo_url: null,
            live_url: null,
            started_on: null,
            featured: false,
          },
        ],
        count: 1,
        elapsed_ms: 1,
      },
    }),
  );
  await page.goto("/");
  await expect(page.getByText(long).first()).toBeVisible();
  expect(await page.evaluate(noSidewaysScroll)).toBe(true);
});
