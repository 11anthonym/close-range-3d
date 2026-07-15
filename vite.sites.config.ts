import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const sitesRoot = fileURLToPath(new URL("./github-pages-src/", import.meta.url));
const publicRoot = fileURLToPath(new URL("./public/", import.meta.url));

export default defineConfig({
  root: sitesRoot,
  publicDir: publicRoot,
  base: "/",
  plugins: [react()],
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
  },
});
