import { access, copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverRoot = resolve(projectRoot, "dist", "server");
const clientRoot = resolve(projectRoot, "dist", "client");
const serverEntry = await readFile(join(serverRoot, "index.js"), "utf8");
const lazyChunkMatch = serverEntry.match(/globalThis\.__VINEXT_LAZY_CHUNKS__\s*=\s*(\[[^;]+\])/);

if (!lazyChunkMatch) throw new Error("Could not find the vinext lazy-chunk manifest in dist/server/index.js");

async function copyJavascriptModules(sourceDirectory, destinationDirectory) {
  for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
    const source = resolve(sourceDirectory, entry.name);
    const destination = resolve(destinationDirectory, entry.name);
    if (!source.startsWith(`${clientRoot}${sep}`) || !destination.startsWith(`${serverRoot}${sep}`)) {
      throw new Error(`Unsafe Sites module path: ${entry.name}`);
    }
    if (entry.isDirectory()) {
      await copyJavascriptModules(source, destination);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
}

// Vinext's lazy entries import shared framework/runtime chunks. Sites packages
// `dist/server` as worker modules, so copy the complete generated JS module
// closure while leaving browser-served images and styles in `dist/client`.
await copyJavascriptModules(join(clientRoot, "assets"), join(serverRoot, "assets"));

for (const relativePath of JSON.parse(lazyChunkMatch[1])) {
  if (typeof relativePath !== "string" || !relativePath.endsWith(".js")) continue;
  const destination = resolve(serverRoot, relativePath);
  if (!destination.startsWith(`${serverRoot}${sep}`)) throw new Error(`Unsafe Sites lazy-chunk path: ${relativePath}`);
  await access(destination);
}

const targets = [
  join(serverRoot, "assets", "faces"),
  join(serverRoot, "assets", "materials"),
  join(serverRoot, "og.png"),
];

for (const target of targets) {
  if (!target.startsWith(`${serverRoot}${sep}`)) throw new Error(`Unsafe Sites asset target: ${target}`);
  await rm(target, { force: true, recursive: true });
}
