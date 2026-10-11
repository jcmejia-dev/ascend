import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "android", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run start",
    env: { ASCEND_DB: "work/e2e-accounts.sqlite", ASCEND_ORIGIN: "" },
    url: "http://localhost:4173",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
