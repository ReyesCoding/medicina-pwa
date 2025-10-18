// medicina-pwa/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    // Servir desde /client
    root: path.resolve(import.meta.dirname, "client"),

    // Rutas relativas para GitHub Pages (subrutas)
    base: "./",

    plugins: [
      react(),
      // 🚫 Sin plugins de Replit para mantener el build limpio y portable
    ],

    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        // 🚫 Se elimina "@assets" porque attached_assets/ ya no existe
      },
    },

    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      sourcemap: !isProd,
    },

    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
