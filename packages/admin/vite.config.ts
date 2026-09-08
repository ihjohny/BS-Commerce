import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Explicitly load .env so BACKEND_URL works regardless of shell environment.
  const env = loadEnv(mode, dirname, "");
  const backendTarget =
    env.BACKEND_URL || process.env.BACKEND_URL || "http://localhost:3000";
  const backendOrigin = new URL(backendTarget).origin;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(dirname, "src"),
        cn: path.resolve(dirname, "src/lib/cn.ts"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
          // Payload CSRF rejects mutations whose Origin doesn't match the
          // backend's trusted origins; make proxied requests look same-origin.
          headers: { origin: backendOrigin },
        },
        "/media": { target: backendTarget, changeOrigin: true },
        "/uploads": { target: backendTarget, changeOrigin: true },
      },
    },
  };
});
