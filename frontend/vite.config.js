import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Define base automaticamente em CI (GitHub Pages) usando nome do repositório
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isCI = !!process.env.GITHUB_ACTIONS;

export default defineConfig({
  base: isCI && repoName ? `/${repoName}/` : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
