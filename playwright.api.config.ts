import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests-integration",
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:4174", browserName: "chromium", viewport: { width: 1280, height: 800 } },
  webServer: [
    {
      command: "PORT=4001 CORS_ORIGIN=http://127.0.0.1:4174 node backend/server.cjs",
      url: "http://127.0.0.1:4001/api/v1/health",
      reuseExistingServer: false,
    },
    {
      command: "VITE_API_BASE_URL=http://127.0.0.1:4001 VITE_DEMO_MODE=true npm run dev -- --host 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
    },
  ],
});