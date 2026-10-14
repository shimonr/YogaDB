import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Docker builds pass VITE_APP_VERSION; local builds read the repo's VERSION file.
const versionFile = new URL("../VERSION", import.meta.url);
const appVersion =
  process.env.VITE_APP_VERSION || (existsSync(versionFile) ? readFileSync(versionFile, "utf8").trim() : "dev");

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
  },
  server: {
    port: 5173,
    // Lets the dev server answer /api like the deployed site does (used by e2e runs against
    // E2E_BASE_URL=http://localhost:5173 with VITE_API_BASE_URL=/api).
    proxy: { "/api": "http://localhost:8000" },
  },
});
