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

test("builds four synchronous geometry-only low-poly human heads", async () => {
  const [game, ledger] = await Promise.all([
    readFile(gameUrl, "utf8"),
    readFile(new URL("../docs/ASSET_LICENSES.md", import.meta.url), "utf8"),
  ]);
  for (const forbidden of [
    /photographic-face/,
    /fictional-casting-atlas/,
    /portraitCanvas/,
    /createFacePortrait/,
    /loadFaceAtlas/,
    /hydrateMakeHumanHead/,
    /createSkinMaterial/,
    /bumpMap/,
  ]) assert.doesNotMatch(game, forbidden);
  assert.match(game, /const LOW_POLY_HEAD_SHAPES:[\s\S]*?function lowPolyHeadShape/);
  const configurations = game.match(/id: "(?:broad-square|long-narrow|heavy-jaw|sharp-chin)"/g) ?? [];
  assert.equal(configurations.length, 4);
  for (const style of ["crew", "side-part", "high-top", "receding"]) assert.match(game, new RegExp(`hairStyle: "${style}"`));
  assert.match(game, /function buildHuman\(target: Target\)/);
  assert.match(game, /function createNoseWedgeGeometry/);
  assert.match(game, /function createCheekPlaneGeometry/);
  assert.match(game, /function countLowPolyHeadTriangles/);
  assert.match(game, /flatShading: true/);
  assert.match(game, /faceAssetStatus = "procedural-low-poly-ready"/);
  assert.match(game, /lowPolyFaceLandmarks\(target\.detail\)/);
  assert.match(game, /new THREE\.SphereGeometry\(1, 12, 8\)/);
  assert.doesNotMatch(game, /SphereGeometry\(1, 112, 88\)/);
  assert.doesNotMatch(ledger, /MakeHuman|casting atlas|portrait/i);
  await assert.rejects(access(new URL("../public/assets/faces/fictional-casting-atlas.png", import.meta.url)));
  await assert.rejects(access(new URL("../public/assets/faces/makehuman-head.glb", import.meta.url)));
});

test("keeps browser multiplayer bounded and free of server-only dependencies", async () => {
  const game = await readFile(gameUrl, "utf8");
  assert.match(game, /CHALLENGE_VERSION = "v1"/);
  assert.match(game, /MAX_CHALLENGE_SCORE = 9_999_999/);
  assert.match(game, /new URLSearchParams\(search\)/);
  assert.match(game, /score >= 0 && score <= MAX_CHALLENGE_SCORE/);
  assert.match(game, /url\.searchParams\.set\(CHALLENGE_QUERY_KEY/);
  assert.doesNotMatch(game, /new WebSocket|socket\.io|peerjs/i);
});
