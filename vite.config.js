import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    proxy: {
      // Local-only bridge: React can request /api/ without relaxing CORS rules.
      "/api": { target: process.env.DJANGO_PROXY_TARGET || "http://127.0.0.1:8000", changeOrigin: false },
    },
  },
});
