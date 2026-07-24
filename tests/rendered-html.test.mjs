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
  assert.match(html, /MAIN MENU/);
  assert.match(html, /SOLO CAMPAIGN/);
  assert.match(html, /24 SEQUENCES/);
  assert.match(html, /SHOOT THE FACE\. OR THE EAR\./);
  assert.match(html, /THE MOST IMPORTANT GAME OF THE YEAR/);
  assert.match(html, /MULTIPLAYER/);
  assert.match(html, /Fan-made browser tribute/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps the full 24-target campaign with free aim and both fire inputs", async () => {
  const source = await readFile(new URL("../app/CloseRangeGame.tsx", import.meta.url), "utf8");
  const config = await readFile(new URL("../app/gameConfig.ts", import.meta.url), "utf8");
  assert.equal((config.match(/\{ codename:/g) ?? []).length, 24);
  assert.match(source, /event\.code === "Space"/);
  assert.match(source, /onPointerDown=\{handleStagePointer\}/);
  assert.match(source, /onPointerMove=\{updateAim\}/);
  assert.match(source, /raycaster\.intersectObjects/);
  assert.match(source, /if \(!hit\)/);
  assert.match(config, /species: "horse"/);
  assert.match(config, /species: "ostrich"/);
});

test("makes individual facial features playable hit zones", async () => {
  const source = await readFile(new URL("../app/CloseRangeGame.tsx", import.meta.url), "utf8");
  for (const zone of ["face", "left-ear", "right-ear", "left-eye", "right-eye", "nose", "mouth", "muzzle", "beak"]) {
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

test("uses faceted low-poly heads and commercial-inspired comedy systems", async () => {
  const source = await readFile(new URL("../app/CloseRangeGame.tsx", import.meta.url), "utf8");
  const config = await readFile(new URL("../app/gameConfig.ts", import.meta.url), "utf8");
  assert.match(source, /function lowPolyMaterial/);
  assert.match(source, /flatShading: true/);
  assert.match(source, /const LOW_POLY_HEAD_SHAPES/);
  assert.match(source, /function buildHuman/);
  assert.match(source, /low-poly-hair/);
  assert.doesNotMatch(source, /portraitCanvas|photographic-face|fictional-casting-atlas/);
  assert.match(source, /I KNOW WHERE YOUR BROTHER IS/);
  assert.match(source, /ANIMAL FACE SIDE MISSION/);
  assert.match(source, /const CRITICAL_PULL_QUOTES/);
  assert.match(source, /CRITICAL CONSENSUS/);
  assert.match(source, /CURRENT MORAL CHOICE/);
  assert.match(source, /PLOT RESOLVED/);
  assert.match(source, /MORAL OPTIONS/);
  assert.match(source, /CLOSE RANGE 2/);
  assert.match(source, /CHAINSAW DAWN/);
  assert.match(config, /GameMode = "solo" \| "couch" \| "challenge"/);
  assert.match(source, /setPlayerScores/);
  assert.match(source, /phase === "complete"/);
});

test("provides a real main menu, two-camera split-screen, and static challenge links", async () => {
  const [source, config, styles, multiplayerDoc] = await Promise.all([
    readFile(new URL("../app/CloseRangeGame.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/gameConfig.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../docs/MULTIPLAYER.md", import.meta.url), "utf8"),
  ]);
  assert.match(source, /aria-label="Main menu"/);
  assert.match(source, /SOLO CAMPAIGN/);
  assert.match(source, /SPLIT-SCREEN VERSUS/);
  assert.match(source, /function SplitScreenVersus/);
  assert.match(source, /aria-label="Two player split-screen versus"/);
  assert.match(source, /<ThreeStage[\s\S]*?<ThreeStage/);
  assert.match(source, /splitTargetIndexFor\(player, current\.progress\)/);
  assert.match(source, /frameRate=\{24\}/);
  assert.match(source, /parseChallengeScore/);
  assert.match(source, /buildChallengeUrl/);
  assert.match(source, /navigator\.clipboard\.writeText\(challengeUrl\)/);
  assert.match(config, /GameMode = "solo" \| "couch" \| "challenge"/);
  assert.match(styles, /grid-template-columns: 1fr 1fr/);
  assert.match(styles, /grid-template-rows: 1fr 1fr/);
  assert.match(styles, /height: 100dvh/);
  assert.match(multiplayerDoc, /static GitHub Pages game/);
  assert.match(multiplayerDoc, /signaling or relay service/);
});

test("keeps the 3D scene readable on desktop and phone displays", async () => {
  const source = await readFile(new URL("../app/CloseRangeGame.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /toneMappingExposure = 1\.42/);
  assert.match(source, /new THREE\.DirectionalLight\(0xffd9c4, 1\.35\)/);
  assert.match(source, /new THREE\.PointLight\(0xffead7, 1\.8/);
  assert.match(styles, /brightness\(1\.18\)/);
  assert.match(styles, /@media \(max-width: 900px\)/);
  assert.match(styles, /brightness\(1\.28\)/);
});
