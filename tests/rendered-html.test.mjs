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
  assert.match(source, /createShards\(runtime, targetRef\.current, shot\.zone/);
  assert.match(source, /ZONE_POINTS\[zone\]/);
  assert.match(source, /setSpecialHits/);
});
