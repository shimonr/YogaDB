import { defineConfig, devices } from "@playwright/test";

// Smoke tests against a running site: E2E_BASE_URL (default: the QA copy on the Oracle VM).
// Login tests run only when E2E_USERNAME and E2E_PASSWORD are set.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "https://qa.yogadb.129-159-8-242.sslip.io",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
});
