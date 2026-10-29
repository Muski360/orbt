import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const testUri = process.env.MONGODB_TEST_URI ?? "mongodb://127.0.0.1:27017/orbt_test";
if (new URL(testUri).pathname !== "/orbt_test") throw new Error("Os testes exigem o banco orbt_test.");

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/global-setup.ts",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: { MONGODB_URI: testUri, JWT_SECRET: "orbt-test-only-secret-with-at-least-32-bytes", APP_URL: "http://127.0.0.1:3100" },
  },
});
