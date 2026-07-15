import { rm } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverRoot = resolve(projectRoot, "dist", "server");
const targets = [
  join(serverRoot, "assets", "faces"),
  join(serverRoot, "assets", "materials"),
  join(serverRoot, "og.png"),
];

for (const target of targets) {
  if (!target.startsWith(`${serverRoot}${sep}`)) throw new Error(`Unsafe Sites asset target: ${target}`);
  await rm(target, { force: true, recursive: true });
}
