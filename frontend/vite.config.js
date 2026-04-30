import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget = process.env.VITE_BACKEND_URL ?? "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      usePolling: true,   // required for HMR inside Docker volume mounts
      interval: 300,
    },
    proxy: {
      "/users":        { target: backendTarget, changeOrigin: true },
      "/pets":         { target: backendTarget, changeOrigin: true },
      "/appointments": { target: backendTarget, changeOrigin: true },
    },
  },
});
