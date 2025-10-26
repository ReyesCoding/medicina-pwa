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
    ],

    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        // 🚫 Se elimina "@assets" porque attached_assets/ ya no existe
      },
    },

   build: {
  outDir: path.resolve(import.meta.dirname, "dist/public"),
  emptyOutDir: true,
  rollupOptions: {
    output: {
      manualChunks: {
        react: ['react', 'react-dom'],
        ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs'],
      }
    }
  }
},

    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
