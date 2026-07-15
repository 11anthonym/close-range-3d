import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Close Range game shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Close Range — 3D Browser Game<\/title>/i);
  assert.match(html, /PLAY ONLINE NOW/);
  assert.match(html, /24 SEQUENCES/);
  assert.match(html, /SHOOT THE FACE\. OR THE EAR\./);
  assert.match(html, /THE MOST IMPORTANT GAME OF THE YEAR/);
  assert.match(html, /UNPARALLELED MULTIPLAYER/);
  assert.match(html, /Fan-made browser tribute/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps the full 24-target campaign with free aim and both fire inputs", async () => {
  const source = await readFile(new URL("../app/CloseRangeGame.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/\{ codename:/g) ?? []).length, 24);
  assert.match(source, /event\.code === "Space"/);
  assert.match(source, /onPointerDown=\{handleStagePointer\}/);
  assert.match(source, /onPointerMove=\{updateAim\}/);
  assert.match(source, /raycaster\.intersectObjects/);
  assert.match(source, /if \(!hit\)/);
  assert.match(source, /species: "horse"/);
  assert.match(source, /species: "ostrich"/);
});

test("makes individual facial features playable hit zones", async () => {
  const source = await readFile(new URL("../app/CloseRangeGame.tsx", import.meta.url), "utf8");
  for (const zone of ["face", "left-ear", "right-ear", "left-eye", "right-eye", "nose", "mouth", "muzzle", "beak", "visor", "jaw"]) {
    assert.match(source, new RegExp(`addHitZone\\(group, "${zone}"`));
  }
  assert.match(source, /entry\.object\.userData\.hitZone !== "face"/);
  assert.match(source, /applyLocalizedDamage\(runtime, targetRef\.current, shot\)/);
  assert.match(source, /ZONE_POINTS\[zone\]/);
  assert.match(source, /setSpecialHits/);
});

test("layers localized destruction while preserving the victim aftermath", async () => {
  const source = await readFile(new URL("../app/CloseRangeGame.tsx", import.meta.url), "utf8");
  assert.match(source, /point: intersection\.point\.toArray/);
  assert.match(source, /direction: raycaster\.ray\.direction\.toArray/);
  assert.match(source, /function createMistCloud/);
  assert.match(source, /function addForegroundSheets/);
  assert.match(source, /function addWallSplat/);
  assert.match(source, /child\.userData\.damageVisual/);
  assert.match(source, /destroysLowerFace && child\.userData\.lowerFace/);
  assert.match(source, /runtime\.target\.userData\.dead = true/);
  assert.doesNotMatch(source, /runtime\.target\.visible = false/);
  assert.match(source, /zone\.endsWith\("eye"\)/);
  assert.match(source, /new THREE\.Points/);
  assert.ok(source.indexOf("const tracking = Math.min(1, delta * 11)") < source.indexOf("child.rotation.y = THREE.MathUtils.lerp"));
});

test("uses procedural skin detail and commercial-inspired comedy systems", async () => {
  const source = await readFile(new URL("../app/CloseRangeGame.tsx", import.meta.url), "utf8");
  assert.match(source, /function createSkinMaterial/);
  assert.match(source, /bumpMap/);
  assert.match(source, /function createHeadGeometry/);
  assert.match(source, /I KNOW WHERE YOUR BROTHER IS/);
  assert.match(source, /ANIMAL FACE SIDE MISSION/);
  assert.match(source, /CLOSE RANGE 2/);
  assert.match(source, /CHAINSAW DAWN/);
  assert.match(source, /GameMode = "solo" \| "couch"/);
  assert.match(source, /setPlayerScores/);
  assert.match(source, /phase === "complete"/);
});
