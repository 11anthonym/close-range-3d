import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

const configUrl = new URL("../app/gameConfig.ts", import.meta.url);
const gameUrl = new URL("../app/CloseRangeGame.tsx", import.meta.url);

test("maps the 24 demo-fidelity encounters in the intended order", async () => {
  const config = await readFile(configUrl, "utf8");
  const sequences = config.split(/\r?\n/).filter((line) => line.includes("{ codename:"));
  assert.equal(sequences.length, 24);
  sequences.slice(0, 4).forEach((line) => assert.match(line, /weaponKind: "revolver".*environmentKind: "alley"/));
  sequences.slice(4, 9).forEach((line) => assert.match(line, /weaponKind: "smg".*environmentKind: "warehouse"/));
  sequences.slice(9, 13).forEach((line) => assert.match(line, /weaponKind: "revolver".*environmentKind: "warehouse"/));
  sequences.slice(13, 18).forEach((line) => assert.match(line, /weaponKind: "shotgun".*environmentKind: "cubicle"/));
  assert.match(sequences[18], /codename: "The Horse".*species: "horse".*weaponKind: "shotgun"/);
  assert.match(sequences[19], /codename: "The Ostrich".*species: "ostrich".*entryKind: "below"/);
  sequences.slice(20).forEach((line) => assert.match(line, /environmentKind: "finale"/));
  assert.match(sequences[20], /weaponKind: "revolver"/);
  assert.match(sequences[21], /weaponKind: "smg"/);
  assert.match(sequences[22], /weaponKind: "shotgun"/);
  assert.match(sequences[23], /weaponKind: "revolver"/);
});

test("defines weapon capacities, reload phases, and precise burst scoring", async () => {
  const [config, game] = await Promise.all([readFile(configUrl, "utf8"), readFile(gameUrl, "utf8")]);
  assert.match(config, /revolver:[\s\S]*?capacity: 6,[\s\S]*?ammoCost: 1/);
  assert.match(config, /smg:[\s\S]*?capacity: 18,[\s\S]*?ammoCost: 3,[\s\S]*?visualBursts: 3/);
  assert.match(config, /shotgun:[\s\S]*?capacity: 5,[\s\S]*?ammoCost: 1/);
  assert.match(config, /"chapter" \| "playing" \| "reloading"/);
  assert.match(game, /if \(phase !== "playing" \|\| lockedRef\.current\) return/);
  assert.match(game, /setPhase\("reloading"\)/);
  assert.match(game, /}, 700\)/);
  assert.match(game, /const hitResult = hitTestRef\.current/);
  assert.match(game, /burstsRemaining = Math\.max\(0, weapon\.visualBursts - 1\)/);
});

test("uses bounded adaptive quality profiles and external-asset fallbacks", async () => {
  const [config, game] = await Promise.all([readFile(configUrl, "utf8"), readFile(gameUrl, "utf8")]);
  for (const expected of [
    /pixelRatio: 1,[\s\S]*?shadows: false,[\s\S]*?mistParticles: 100,[\s\S]*?chunks: 12,[\s\S]*?foregroundSheets: 1,[\s\S]*?textureSize: 512/,
    /pixelRatio: 1\.35,[\s\S]*?shadowMapSize: 512,[\s\S]*?mistParticles: 180,[\s\S]*?chunks: 24,[\s\S]*?foregroundSheets: 2/,
    /pixelRatio: 1\.75,[\s\S]*?shadowMapSize: 1024,[\s\S]*?mistParticles: 280,[\s\S]*?chunks: 48,[\s\S]*?foregroundSheets: 4/,
  ]) assert.match(config, expected);
  assert.match(game, /assetStatus = "procedural-fallback"/);
  assert.match(game, /\(\) => resolve\(null\)/);
  assert.match(game, /preloadEnvironmentAssets/);
  assert.match(game, /entry\.userData\.disposed = true/);
});

test("ships both material sizes and records their license provenance", async () => {
  const root = new URL("../public/assets/materials/", import.meta.url);
  for (const surface of ["brick", "concrete"]) {
    for (const channel of ["diffuse", "normal", "rough"]) {
      for (const size of [512, 1024]) {
        const file = new URL(`${surface}-${channel}-${size}.jpg`, root);
        await access(file);
        assert.ok((await stat(file)).size > 10_000);
      }
    }
  }
  const ledger = await readFile(new URL("../docs/ASSET_LICENSES.md", import.meta.url), "utf8");
  assert.match(ledger, /Brick Wall 001/);
  assert.match(ledger, /Concrete Floor 02/);
  assert.match(ledger, /CC0/);
});

test("loads a clean face shell and an aligned fictional casting atlas", async () => {
  const [game, ledger, extractor] = await Promise.all([
    readFile(gameUrl, "utf8"),
    readFile(new URL("../docs/ASSET_LICENSES.md", import.meta.url), "utf8"),
    readFile(new URL("../scripts/extract-makehuman-head.mjs", import.meta.url), "utf8"),
  ]);
  const runtimeHead = new URL("../public/assets/faces/makehuman-head.glb", import.meta.url);
  const castingAtlas = new URL("../public/assets/faces/fictional-casting-atlas.png", import.meta.url);
  await Promise.all([access(runtimeHead), access(castingAtlas)]);
  assert.ok((await stat(runtimeHead)).size > 100_000);
  assert.ok((await stat(castingAtlas)).size > 1_000_000);
  assert.match(game, /function parseProofHeadGlb/);
  assert.match(game, /new DataView\(buffer\)/);
  assert.match(game, /new THREE\.BufferGeometry\(\)/);
  assert.match(game, /TEXCOORD_0/);
  assert.match(game, /geometry\.setAttribute\("uv"/);
  assert.doesNotMatch(game, /GLTFLoader|MeshoptDecoder/);
  assert.match(game, /function hydrateMakeHumanHead/);
  assert.match(game, /function shapeProofHeadGeometry/);
  assert.match(game, /function portraitCanvas/);
  assert.match(game, /function createFacePortrait/);
  assert.match(game, /fictional-casting-atlas\.png/);
  assert.match(game, /faceAssetStatus = "hybrid-face-loaded"/);
  assert.match(game, /faceAssetStatus = "procedural-fallback"/);
  assert.match(extractor, /group !== "body"/);
  assert.match(extractor, /NECK_CUT_Y = 5\.7/);
  assert.match(ledger, /MakeHuman visible outer-head shell/);
  assert.match(ledger, /Original fictional casting atlas/);
  assert.doesNotMatch(ledger, /makehuman-head-meshopt\.glb/);

  const binary = await readFile(runtimeHead);
  const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  let json;
  for (let offset = 12; offset + 8 <= view.byteLength;) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    if (type === 0x4e4f534a) {
      json = JSON.parse(new TextDecoder().decode(binary.subarray(offset + 8, offset + 8 + length)).replace(/[\u0000 ]+$/g, ""));
    }
    offset += 8 + length;
  }
  const primitive = json?.meshes?.[0]?.primitives?.[0];
  const positions = json?.accessors?.[primitive?.attributes?.POSITION];
  const uvs = json?.accessors?.[primitive?.attributes?.TEXCOORD_0];
  assert.ok(primitive && positions && uvs);
  assert.ok(positions.count > 4_400 && positions.count < 4_700);
  assert.equal(uvs.count, positions.count);
  assert.ok(positions.min[0] > -1.1 && positions.max[0] < 1.1);
  assert.ok(positions.min[1] >= 5.7 && positions.max[1] < 8.6);
});
