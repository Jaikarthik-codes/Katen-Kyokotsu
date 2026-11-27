import { defineConfig, devices } from "@playwright/test";

// PW_CHROMIUM_PATH lets a machine with a pre-installed Chromium use it instead of
// Playwright's own download (leave unset normally).
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:4173",
    trace: "off",
    launchOptions: { executablePath },
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    // The smoke tests need live data, so the build must know where the API is.
    env: { VITE_API_URL: process.env.VITE_API_URL || "http://localhost:8000" },
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
});
