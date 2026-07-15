import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverRoot = resolve(projectRoot, "dist", "server");
const workerSource = resolve(projectRoot, "scripts", "sites-static-worker.mjs");
const originalWrangler = JSON.parse(await readFile(join(serverRoot, "wrangler.json"), "utf8"));

await rm(serverRoot, { force: true, recursive: true });
await mkdir(serverRoot, { recursive: true });
await copyFile(workerSource, join(serverRoot, "index.js"));

const staticWrangler = {
  ...originalWrangler,
  main: "index.js",
  no_bundle: true,
  rules: [{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }],
  assets: { directory: "../client" },
};
await writeFile(join(serverRoot, "wrangler.json"), `${JSON.stringify(staticWrangler)}\n`, "utf8");
