import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const dashboardApiTarget =
  process.env.DASHBOARD_API_TARGET || "https://aiconclave-dashboard.pages.dev";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
    proxy: {
      "/api": {
        target: dashboardApiTarget,
        changeOrigin: true,
        secure: true,
        configure(proxy) {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("origin", dashboardApiTarget);
          });
        },
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
