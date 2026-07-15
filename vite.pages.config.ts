import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const pagesRoot = fileURLToPath(new URL("./github-pages-src/", import.meta.url));
const publicRoot = fileURLToPath(new URL("./public/", import.meta.url));

export default defineConfig({
  root: pagesRoot,
  publicDir: publicRoot,
  base: "/close-range-3d/",
  plugins: [react()],
  build: {
    outDir: "../pages-dist",
    emptyOutDir: true,
  },
});
