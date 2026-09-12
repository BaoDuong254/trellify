import { defineConfig, devices } from "@playwright/test";

import {
  API_URL,
  AUTH_STATE_PATH,
  CLIENT_URL,
  E2E_ENVIRONMENT,
  REPO_ROOT,
  TURNSTILE_SITE_KEY,
} from "./support/environment";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: CLIENT_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      testMatch: /.*\.e2e\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: AUTH_STATE_PATH },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command: "pnpm --filter=server exec tsx src/index.ts",
      cwd: REPO_ROOT,
      url: `${API_URL}/api/v1/status`,
      env: E2E_ENVIRONMENT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: `pnpm --filter=client exec vite --port ${new URL(CLIENT_URL).port} --strictPort`,
      cwd: REPO_ROOT,
      url: CLIENT_URL,
      env: { VITE_API_ENDPOINT: API_URL, VITE_TURNSTILE_SITE_KEY: TURNSTILE_SITE_KEY },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
