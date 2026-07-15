import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverRoot = resolve(projectRoot, "dist", "server");
const clientRoot = resolve(projectRoot, "dist", "client");
const serverEntry = await readFile(join(serverRoot, "index.js"), "utf8");
const lazyChunkMatch = serverEntry.match(/globalThis\.__VINEXT_LAZY_CHUNKS__\s*=\s*(\[[^;]+\])/);

if (!lazyChunkMatch) throw new Error("Could not find the vinext lazy-chunk manifest in dist/server/index.js");

for (const relativePath of JSON.parse(lazyChunkMatch[1])) {
  if (typeof relativePath !== "string" || !relativePath.endsWith(".js")) continue;
  const source = resolve(clientRoot, relativePath);
  const destination = resolve(serverRoot, relativePath);
  if (!source.startsWith(`${clientRoot}${sep}`) || !destination.startsWith(`${serverRoot}${sep}`)) {
    throw new Error(`Unsafe Sites lazy-chunk path: ${relativePath}`);
  }
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
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
