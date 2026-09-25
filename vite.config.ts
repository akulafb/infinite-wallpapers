import { resolve } from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Renderer build: two HTML entry points (main + settings windows).
export default defineConfig({
  root: import.meta.dirname,
  // Relative asset URLs so the built HTML loads from file:// in the packaged app.
  base: "./",
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "main-window.html"),
        settings: resolve(import.meta.dirname, "settings-window.html"),
      },
    },
  },
});
