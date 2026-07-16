import { readFile, writeFile } from "node:fs/promises";

const [, , sourcePath, destinationPath] = process.argv;
if (!sourcePath || !destinationPath) {
  throw new Error("Usage: node scripts/extract-makehuman-head.mjs <base.obj> <head.obj>");
}

const lines = (await readFile(sourcePath, "utf8")).split(/\r?\n/);
const positions = [];
const textureCoordinates = [];
const selectedFaces = [];
const NECK_CUT_Y = 5.7;
let group = "";

for (const line of lines) {
  if (line.startsWith("v ")) {
    positions.push(line);
    continue;
  }
  if (line.startsWith("vt ")) {
    textureCoordinates.push(line);
    continue;
  }
  if (line.startsWith("g ")) {
    group = line.slice(2).trim();
    continue;
  }
  if (group !== "body" || !line.startsWith("f ")) continue;
  const face = line.trim().split(/\s+/).slice(1).map((token) => {
    const [position, texture] = token.split("/").map(Number);
    return { position: position - 1, texture: texture - 1 };
  });
  if (face.every((entry) => Number(positions[entry.position].split(/\s+/)[2]) > NECK_CUT_Y)) selectedFaces.push(face);
}

const usedPositions = new Map();
const usedTextures = new Map();
for (const face of selectedFaces) {
  for (const entry of face) {
    if (!usedPositions.has(entry.position)) usedPositions.set(entry.position, usedPositions.size + 1);
    if (!usedTextures.has(entry.texture)) usedTextures.set(entry.texture, usedTextures.size + 1);
  }
}

if (selectedFaces.length < 4_000 || selectedFaces.length > 4_500 || usedPositions.size < 4_000 || usedPositions.size > 4_500) {
  throw new Error(`Unexpected MakeHuman head topology: ${usedPositions.size} vertices, ${selectedFaces.length} faces`);
}

const output = [
  "# MakeHuman hm08 visible outer-head shell",
  "# Extracted only from the visible body group above y=5.7; helper geometry is intentionally excluded.",
  ...[...usedPositions.keys()].map((index) => positions[index]),
  ...[...usedTextures.keys()].map((index) => textureCoordinates[index]),
  "g head-outer-shell",
  ...selectedFaces.map((face) => `f ${face.map((entry) => `${usedPositions.get(entry.position)}/${usedTextures.get(entry.texture)}`).join(" ")}`),
  "",
];

await writeFile(destinationPath, output.join("\n"), "utf8");
console.log(`Extracted ${usedPositions.size} visible vertices and ${selectedFaces.length} faces`);
