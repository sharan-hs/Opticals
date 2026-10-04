import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The browser always calls /api on the site's own origin: Vite forwards it
  // to the local backend here, and Vercel forwards it in production
  // (vercel.json). Same origin means no CORS and first-party login cookies.
  server: {
    port: 3000,
    proxy: { "/api": "http://localhost:8000" },
  },
  preview: {
    port: 3000,
    proxy: { "/api": "http://localhost:8000" },
  },
  // Vercel publishes this folder (vercel.json outputDirectory).
  build: {
    outDir: "build",
    // The lazily loaded three.js chunk (home hero only) is ~900 kB raw.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    // Node's fetch needs absolute URLs; the mock API (MSW) listens here.
    env: { VITE_API_BASE_URL: "http://localhost:3000/api/v1" },
  },
});
