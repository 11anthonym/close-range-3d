"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject } from "react";
import * as THREE from "three";
import {
  CHAPTERS,
  QUALITY_PROFILES,
  SEQUENCES,
  WEAPON_PROFILES,
  chapterForSequence,
  resolveQualityTier,
  type GameMode,
  type Phase,
  type QualityMode,
  type QualityProfile,
  type QualityTier,
  type SequenceDefinition,
  type Species,
  type WeaponKind,
} from "./gameConfig";

type Target = SequenceDefinition;

const INTRO = [
  "YOUR NAME IS A.J.",
  "YOUR PAST IS CLASSIFIED.",
  "YOUR BROTHER IS MISSING.",
  "THERE IS ONLY ONE LEAD — AND IT IS VERY CLOSE.",
  "THE ENTIRE FACE IS OPEN.",
];

const PRAISE = [
  "EXCELLENT!", "GREAT JOB!", "HEAD SHOT!", "NICE SHOT!", "IN THE ZONE!", "BONUS!",
  "KILL TOWN!", "RICHLY DETAILED!", "IMMERSIVE!", "OPEN-ENDED!", "IMPORTANT!", "UNPARALLELED!",
];

const VICTIM_DIALOGUE = [
  "I KNOW WHERE YOUR BROTHER IS.",
  "THE DRIVER WAS MEANT TO DRIVE.",
  "I HAVE THE COMPLETE TAX RECORDS.",
  "WHO ARE YOU?",
  "SOMEONE WHO CAN HELP.",
  "I HAVE A VERY DEVELOPED BACKSTORY.",
  "WE CAN RESOLVE THIS WITH EXPOSITION.",
  "LOOK OUT!",
  "THE TRAIN IS NOT PART OF THE PLOT.",
  "I JUST BOUGHT THIS SHIRT.",
  "A.J., YOUR BROTHER IS AT THE--",
  "[IMPORTANT STORY NEIGHING]",
  "I FIXED THE THING YOU SHOT.",
  "THE UNION REQUIRES A MONOLOGUE.",
  "[THE PLOT THICKENS SILENTLY]",
  "I AM THE NARRATIVELY IDENTICAL REPLACEMENT.",
  "WELCOME. PLEASE IGNORE MY SHOOTABLE FACE.",
  "I WAS PROMISED UNPARALLELED INTERACTIVITY.",
  "DINNER IS SERVED. SO IS MY FACE.",
  "HAVEN'T WE DONE THIS FACE ALREADY?",
  "I HAVE THE FINAL PIECE OF THE MYSTERY.",
  "THE OTHER INFORMANT WAS LESS INFORMED.",
  "A.J., IT'S ME. YOUR BRO--",
  "WAIT. IF YOU'RE A.J., THEN WHO--",
];

const NARRATOR_BEATS = [
  "INTELLIGENCE CONFIRMS: THIS PERSON HAS A FACE.",
  "THE KIDNAPPED-BROTHER PLOT ADVANCES BY ZERO PERCENT.",
  "A RICHLY DETAILED WORLD, VIEWED FROM EIGHT INCHES AWAY.",
  "WELL-DEVELOPED CHARACTER DEVELOPMENT COMPLETE.",
  "THE ENDLESS STREAM OF FACES CONTINUES.",
  "AN IMPORTANT MORAL CHOICE WAS AVAILABLE. YOU FIRED.",
];

type Shard = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
  gravity?: number;
  shrink?: boolean;
};

type MistCloud = {
  points: THREE.Points;
  velocity: Float32Array;
  life: number;
  gravity: number;
};

type Runtime = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  target: THREE.Group | null;
  hitTargets: THREE.Mesh[];
  environment: THREE.Group | null;
  gun: THREE.Group;
  muzzle: THREE.PointLight;
  muzzleMesh: THREE.Mesh;
  weaponKind: WeaponKind;
  quality: QualityProfile;
  shards: Shard[];
  mistClouds: MistCloud[];
  aftermath: THREE.Object3D[];
  recoil: number;
  shotFlash: number;
  burstCooldown: number;
  burstsRemaining: number;
  hitShake: number;
  targetEnter: number;
  frame: number;
  reducedMotion: boolean;
};

type Aim = { x: number; y: number };
type HitZone =
  | "face"
  | "left-ear"
  | "right-ear"
  | "left-eye"
  | "right-eye"
  | "nose"
  | "mouth"
  | "muzzle"
  | "beak";
type HitResult = { hit: boolean; zone: HitZone | null; point?: [number, number, number]; direction?: [number, number, number] };
type Shot = { tick: number; hit: boolean; zone: HitZone | null; point?: [number, number, number]; direction?: [number, number, number] };
type HitTest = () => HitResult;

const ZONE_POINTS: Record<HitZone, number> = {
  face: 1000,
  "left-ear": 1850,
  "right-ear": 1850,
  "left-eye": 2250,
  "right-eye": 2250,
  nose: 1700,
  mouth: 1550,
  muzzle: 1750,
  beak: 1900,
};

const ZONE_FEEDBACK: Record<HitZone, string> = {
  face: "EXCELLENT",
  "left-ear": "THE EAR!",
  "right-ear": "OTHER EAR!",
  "left-eye": "EYE CONTACT!",
  "right-eye": "EYE CONTACT!",
  nose: "NOSE FIRST!",
  mouth: "SPEECHLESS!",
  muzzle: "MUZZLED!",
  beak: "DE-BEAKED!",
};

function zoneLabel(zone: HitZone) {
  if (zone === "left-ear") return "LEFT EAR";
  if (zone === "right-ear") return "RIGHT EAR";
  if (zone === "left-eye") return "LEFT EYE";
  if (zone === "right-eye") return "RIGHT EYE";
  if (zone === "muzzle") return "MUZZLE";
  if (zone === "beak") return "BEAK";
  return zone.toUpperCase();
}

function zoneCategory(zone: HitZone) {
  if (zone.endsWith("ear")) return "EAR";
  if (zone.endsWith("eye")) return "EYE";
  return zone.toUpperCase();
}

function availableZoneCategories(species: Species) {
  if (species === "human") return ["FACE", "EAR", "EYE", "NOSE", "MOUTH"];
  if (species === "horse") return ["FACE", "EAR", "EYE", "MUZZLE"];
  return ["FACE", "EYE", "BEAK"];
}

function material(color: number, roughness = 0.72, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function physicalMaterial(color: number, roughness = 0.62, metalness = 0, clearcoat = 0.08) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness, clearcoat, clearcoatRoughness: 0.78 });
}

function seededRandom(seed: number) {
  let value = Math.max(1, seed * 104729 + 97) % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function createSkinMaterial(skin: number, detail: number, textureSize: 512 | 1024) {
  const size = textureSize;
  const albedoCanvas = document.createElement("canvas");
  const bumpCanvas = document.createElement("canvas");
  albedoCanvas.width = bumpCanvas.width = size;
  albedoCanvas.height = bumpCanvas.height = size;
  const albedo = albedoCanvas.getContext("2d");
  const bump = bumpCanvas.getContext("2d");
  if (!albedo || !bump) return physicalMaterial(skin, 0.62, 0, 0.03);

  const random = seededRandom(detail + 41);
  const red = (skin >> 16) & 255;
  const green = (skin >> 8) & 255;
  const blue = skin & 255;
  const albedoPixels = albedo.createImageData(size, size);
  const bumpPixels = bump.createImageData(size, size);
  for (let i = 0; i < size * size; i += 1) {
    const pore = (random() - 0.5) * 17;
    const warmth = (random() - 0.5) * 9;
    albedoPixels.data[i * 4] = THREE.MathUtils.clamp(red + pore + warmth, 0, 255);
    albedoPixels.data[i * 4 + 1] = THREE.MathUtils.clamp(green + pore * 0.55, 0, 255);
    albedoPixels.data[i * 4 + 2] = THREE.MathUtils.clamp(blue + pore * 0.42 - warmth * 0.3, 0, 255);
    albedoPixels.data[i * 4 + 3] = 255;
    const height = THREE.MathUtils.clamp(132 + pore * 2.2 + (random() > 0.982 ? -52 : 0), 0, 255);
    bumpPixels.data[i * 4] = height;
    bumpPixels.data[i * 4 + 1] = height;
    bumpPixels.data[i * 4 + 2] = height;
    bumpPixels.data[i * 4 + 3] = 255;
  }
  albedo.putImageData(albedoPixels, 0, 0);
  bump.putImageData(bumpPixels, 0, 0);

  // Uneven capillaries, freckles and beard shadow stop the close-up skin reading as plastic.
  albedo.globalCompositeOperation = "multiply";
  for (let i = 0; i < 95 + (detail % 4) * 35; i += 1) {
    const radius = 0.45 + random() * (detail % 3 === 0 ? 2.2 : 1.25);
    albedo.globalAlpha = 0.05 + random() * 0.13;
    albedo.fillStyle = i % 5 ? "#5b3026" : "#9b4a42";
    albedo.beginPath();
    albedo.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
    albedo.fill();
  }
  if (detail % 3 === 1 || detail % 5 === 2) {
    const beard = albedo.createLinearGradient(0, size * 0.45, 0, size);
    beard.addColorStop(0, "rgba(30,35,34,0)");
    beard.addColorStop(1, "rgba(20,24,24,0.34)");
    albedo.globalAlpha = 0.5;
    albedo.fillStyle = beard;
    albedo.fillRect(0, size * 0.42, size, size * 0.58);
  }
  albedo.globalAlpha = 1;
  albedo.globalCompositeOperation = "source-over";

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1.35, 1.1);
  map.anisotropy = 8;
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.copy(map.repeat);
  bumpMap.anisotropy = 8;
  const skinColor = new THREE.Color(skin);
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map,
    bumpMap,
    bumpScale: 0.012,
    roughnessMap: bumpMap,
    roughness: 0.68,
    metalness: 0,
    clearcoat: 0.025,
    clearcoatRoughness: 0.9,
    sheen: 0.16,
    sheenColor: skinColor.clone().lerp(new THREE.Color(0xff6b58), 0.28),
    sheenRoughness: 0.82,
  });
}

function mesh(geometry: THREE.BufferGeometry, color: number, roughness?: number, metalness?: number) {
  const result = new THREE.Mesh(geometry, material(color, roughness, metalness));
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function addBox(group: THREE.Group, size: [number, number, number], position: [number, number, number], color: number) {
  const item = mesh(new THREE.BoxGeometry(...size), color);
  item.position.set(...position);
  group.add(item);
  return item;
}

function disposeObject(root: THREE.Object3D | null) {
  if (!root) return;
  root.userData.disposed = true;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((child) => {
    const item = child as THREE.Mesh;
    if (item.geometry && !geometries.has(item.geometry)) {
      geometries.add(item.geometry);
      item.geometry.dispose();
    }
    const itemMaterial = item.material as THREE.Material | THREE.Material[] | undefined;
    const disposeMaterial = (entry: THREE.Material) => {
      if (materials.has(entry)) return;
      materials.add(entry);
      entry.userData.disposed = true;
      Object.values(entry).forEach((value) => {
        if (value instanceof THREE.Texture && !textures.has(value)) {
          textures.add(value);
          value.dispose();
        }
      });
      entry.dispose();
    };
    if (Array.isArray(itemMaterial)) itemMaterial.forEach(disposeMaterial);
    else if (itemMaterial) disposeMaterial(itemMaterial);
  });
  root.removeFromParent();
}

function addMaterialEllipsoid(
  group: THREE.Group,
  scale: [number, number, number],
  position: [number, number, number],
  finish: THREE.Material,
  segments = 36,
) {
  const item = new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.max(20, Math.floor(segments * 0.72))), finish);
  item.scale.set(...scale);
  item.position.set(...position);
  item.castShadow = true;
  item.receiveShadow = true;
  group.add(item);
  return item;
}

function addEllipsoid(
  group: THREE.Group,
  scale: [number, number, number],
  position: [number, number, number],
  color: number,
  segments = 28,
) {
  const item = mesh(new THREE.SphereGeometry(1, segments, Math.max(16, Math.floor(segments * 0.72))), color, 0.68, 0.01);
  item.scale.set(...scale);
  item.position.set(...position);
  group.add(item);
  return item;
}

function addHitZone(
  group: THREE.Group,
  zone: HitZone,
  position: [number, number, number],
  scale: [number, number, number],
) {
  const target = new THREE.Mesh(
    new THREE.SphereGeometry(1, 22, 16),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  );
  target.name = `hit-zone:${zone}`;
  target.userData.hitZone = zone;
  target.position.set(...position);
  target.scale.set(...scale);
  group.add(target);
  return target;
}

function createHeadGeometry(detail: number) {
  const geometry = new THREE.SphereGeometry(1, 112, 88);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const base = detail % 4;
  const asymmetry = ((detail % 5) - 2) * 0.008;
  const jawTaper = [0.13, 0.19, 0.155, 0.225][base];
  const skullWidth = [1.04, 0.96, 1.01, 0.925][base];
  const skullHeight = [0.98, 1.045, 1.0, 1.075][base];
  const profileDepth = [1.03, 0.96, 1.075, 0.99][base];
  for (let index = 0; index < position.count; index += 1) {
    let x = position.getX(index);
    let y = position.getY(index);
    let z = position.getZ(index);
    x *= skullWidth;
    y *= skullHeight;
    z *= profileDepth;
    const lowerFace = Math.max(0, -y);
    const cheekPlane = Math.exp(-Math.pow((y + 0.03) / 0.3, 2));
    const temple = Math.exp(-Math.pow((y - 0.38) / 0.22, 2));
    x *= 1 - lowerFace * jawTaper + cheekPlane * 0.035 - temple * 0.025;
    if (base === 0) x *= 1 + cheekPlane * 0.045;
    if (base === 1) z += cheekPlane * 0.025;
    if (base === 2 && y < -0.35) x *= 1.035;
    if (base === 3 && y < -0.42) z += lowerFace * 0.055;
    x += asymmetry * (1 - Math.abs(y));
    z *= 0.96 + cheekPlane * 0.055;
    if (y < -0.55) z += Math.pow((-y - 0.55) / 0.45, 2) * 0.11;
    position.setXYZ(index, x, y, z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function buildHuman(target: Target, quality: QualityProfile) {
  const group = new THREE.Group();
  const [skin, hair, clothes] = target.palette;
  const faceWidth = 0.315 + (target.detail % 3) * 0.009;
  const skinFinish = createSkinMaterial(skin, target.detail, quality.textureSize);
  const head = new THREE.Mesh(createHeadGeometry(target.detail), skinFinish);
  head.scale.set(faceWidth, 0.41 + (target.detail % 4) * 0.004, 0.286);
  head.position.set(0, 0.34, 0);
  head.castShadow = true;
  head.receiveShadow = true;
  head.userData.faceBase = target.detail % 4;
  group.add(head);

  // Facial planes use the same pore-mapped finish so their boundaries visually merge into the cranium.
  addMaterialEllipsoid(group, [0.177, 0.155, 0.074], [-0.114, 0.265, 0.227], skinFinish, 44);
  addMaterialEllipsoid(group, [0.177, 0.155, 0.074], [0.114, 0.265, 0.227], skinFinish, 44);
  const jaw = addMaterialEllipsoid(group, [0.22, 0.17, 0.128], [0, 0.085, 0.07], skinFinish, 48);
  jaw.scale.x *= 0.94 + (target.detail % 4) * 0.018;
  jaw.userData.lowerFace = true;
  addMaterialEllipsoid(group, [0.126, 0.07, 0.065], [0, 0.182, 0.258], skinFinish, 40);

  const earGeometry = new THREE.SphereGeometry(1, 24, 18);
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(earGeometry.clone(), skinFinish);
    ear.position.set((faceWidth + 0.018) * side, 0.32, 0.005);
    ear.scale.set(0.045, 0.09, 0.033);
    ear.castShadow = true;
    group.add(ear);
    const innerEar = addEllipsoid(group, [0.013, 0.047, 0.015], [(faceWidth + 0.024) * side, 0.32, 0.034], 0x6b302b, 20);
    innerEar.rotation.z = side * 0.12;
  });

  const eyeSpacing = 0.118 + (target.detail % 2) * 0.006;
  [-1, 1].forEach((side) => {
    const socket = addEllipsoid(group, [0.083, 0.055, 0.025], [eyeSpacing * side, 0.39, 0.263], 0x4b2823, 32);
    socket.scale.x *= 1.05;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), physicalMaterial(0xe5dfd2, 0.28, 0, 0.45));
    eye.name = `living-eye:${side < 0 ? "left" : "right"}`;
    eye.position.set(eyeSpacing * side, 0.39, 0.279);
    eye.scale.set(0.064, 0.035, 0.027);
    group.add(eye);
    const irisColor = [0x35261c, 0x3a4c43, 0x273b4c][target.detail % 3];
    const iris = mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.006, 24), irisColor, 0.35, 0.05);
    iris.rotation.x = Math.PI / 2;
    iris.position.set(eyeSpacing * side, 0.39, 0.309);
    group.add(iris);
    const pupil = mesh(new THREE.SphereGeometry(0.008, 16, 10), 0x050505, 0.2, 0.1);
    pupil.position.set(eyeSpacing * side, 0.39, 0.315);
    group.add(pupil);
    const catchlight = mesh(new THREE.SphereGeometry(0.0045, 10, 8), 0xffffff, 0.1, 0);
    catchlight.position.set(eyeSpacing * side - 0.006, 0.398, 0.322);
    group.add(catchlight);
    const cornea = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.04, transmission: 0.18 }),
    );
    cornea.scale.set(0.065, 0.036, 0.029);
    cornea.position.set(eyeSpacing * side, 0.39, 0.284);
    group.add(cornea);
    const lid = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.009, 8, 32, Math.PI), skinFinish);
    lid.scale.y = 0.55;
    lid.rotation.z = side * 0.03;
    lid.position.set(eyeSpacing * side, 0.4, 0.307);
    group.add(lid);
    addEllipsoid(group, [0.008, 0.006, 0.006], [(eyeSpacing - 0.055) * side, 0.386, 0.313], 0x8d3d37, 14);
    const brow = mesh(new THREE.CapsuleGeometry(0.014, 0.105, 6, 12), hair, 0.88, 0);
    brow.rotation.z = Math.PI / 2 + side * (target.detail % 2 ? -0.09 : 0.06);
    brow.position.set(eyeSpacing * side, 0.485, 0.273);
    group.add(brow);
  });

  addMaterialEllipsoid(group, [0.038 + (target.detail % 3) * 0.004, 0.118, 0.041], [0, 0.32, 0.286], skinFinish, 42);
  addMaterialEllipsoid(group, [0.064 + (target.detail % 4) * 0.003, 0.048, 0.052], [0, 0.25, 0.32], skinFinish, 42);
  [-1, 1].forEach((side) => addEllipsoid(group, [0.014, 0.009, 0.008], [0.026 * side, 0.243, 0.363], 0x2b1713, 16));

  // Subtle nasolabial folds and forehead creases catch the raking key light.
  [-1, 1].forEach((side) => {
    const fold = mesh(new THREE.CapsuleGeometry(0.004, 0.095, 5, 10), 0x7b4338, 0.9, 0);
    fold.position.set(0.078 * side, 0.205, 0.295);
    fold.rotation.z = side * -0.25;
    group.add(fold);
  });
  if (target.detail % 4 >= 2) {
    [-1, 0, 1].forEach((offset) => {
      const crease = mesh(new THREE.CapsuleGeometry(0.0025, 0.12, 4, 9), 0x704037, 0.95, 0);
      crease.rotation.z = Math.PI / 2;
      crease.position.set(offset * 0.035, 0.545 + Math.abs(offset) * 0.018, 0.264);
      group.add(crease);
    });
  }

  const lipColor = target.detail % 4 === 0 ? 0x6c332f : 0x4a2724;
  const mouthOpen = target.detail % 3 === 0;
  const mouthPartStart = group.children.length;
  if (mouthOpen) {
    addEllipsoid(group, [0.087, 0.034, 0.018], [0, 0.112, 0.302], 0x140606, 30);
    addBox(group, [0.105, 0.016, 0.01], [0, 0.123, 0.319], 0xe5dbc5);
    addBox(group, [0.096, 0.009, 0.009], [0, 0.095, 0.315], 0xd6cbb7);
  }
  const upperLip = addEllipsoid(group, [0.093, 0.018, 0.022], [0, 0.125, 0.292], lipColor, 28);
  upperLip.rotation.z = (target.detail % 3 - 1) * 0.035;
  addEllipsoid(group, [0.083, 0.014, 0.018], [0, 0.105, 0.288], 0x7d443d, 26);
  if (!mouthOpen) addEllipsoid(group, [0.085, 0.007, 0.008], [0, 0.116, 0.313], 0x170b0a, 22);
  group.children.slice(mouthPartStart).forEach((child) => { child.userData.lowerFace = true; });

  const hairCap = mesh(
    new THREE.SphereGeometry(1, 52, 28, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hair,
  );
  hairCap.name = "procedural-hair";
  hairCap.scale.set(faceWidth * 1.045, 0.425, 0.295);
  hairCap.position.y = 0.345;
  group.add(hairCap);
  const fringeCount = 7 + (target.detail % 4);
  for (let i = 0; i < fringeCount; i += 1) {
    const strand = mesh(new THREE.CapsuleGeometry(0.014, 0.1 + (i % 3) * 0.025, 5, 9), hair, 0.9, 0);
    strand.name = "procedural-hair";
    strand.position.set(-0.22 + i * (0.44 / Math.max(1, fringeCount - 1)), 0.625 + Math.sin(i * 1.8) * 0.018, 0.15 + Math.cos(i) * 0.015);
    strand.rotation.z = (i - fringeCount / 2) * 0.05;
    group.add(strand);
  }

  if (target.detail % 5 === 4) {
    const glasses = material(0x080808, 0.25, 0.25);
    [-1, 1].forEach((side) => {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.073, 0.009, 10, 28), glasses);
      lens.scale.y = 0.72;
      lens.position.set(eyeSpacing * side, 0.39, 0.335);
      group.add(lens);
    });
    addBox(group, [0.08, 0.014, 0.014], [0, 0.39, 0.335], 0x080808);
  }

  group.children.forEach((child) => {
    if (child.name !== "procedural-hair") child.userData.proceduralFace = true;
  });
  group.userData.faceBase = target.detail % 4;
  group.userData.faceAssetStatus = "procedural-fallback";

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.32, 36), skinFinish);
  neck.castShadow = true;
  neck.position.y = -0.12;
  group.add(neck);
  const shoulders = addEllipsoid(group, [0.59, 0.28, 0.25], [0, -0.48, -0.02], clothes, 36);
  shoulders.rotation.x = -0.05;
  const torso = mesh(new THREE.CylinderGeometry(0.38, 0.55, 0.72, 28), clothes, 0.8, 0.02);
  torso.position.y = -0.72;
  group.add(torso);
  const shirt = addBox(group, [0.19, 0.52, 0.025], [0, -0.58, 0.255], 0x17191a);
  shirt.rotation.x = -0.04;
  [-1, 1].forEach((side) => {
    const lapel = addBox(group, [0.18, 0.42, 0.03], [0.115 * side, -0.51, 0.275], clothes === 0x111111 ? 0x292929 : clothes);
    lapel.rotation.z = side * 0.24;
    lapel.rotation.x = -0.05;
  });
  return group;
}

function buildHorse(target: Target) {
  const group = new THREE.Group();
  const [coat, mane, blanket] = target.palette;
  const head = mesh(new THREE.SphereGeometry(0.35, 42, 30), coat);
  head.scale.set(0.72, 1.25, 1.08);
  head.position.set(0, 0.3, 0.02);
  group.add(head);
  const muzzle = mesh(new THREE.SphereGeometry(0.25, 36, 24), 0x9d7154);
  muzzle.scale.set(0.78, 0.7, 1.2);
  muzzle.position.set(0, 0.15, 0.31);
  muzzle.userData.lowerFace = true;
  group.add(muzzle);
  [-1, 1].forEach((side) => {
    const ear = mesh(new THREE.ConeGeometry(0.085, 0.36, 10), coat);
    ear.position.set(0.16 * side, 0.72, -0.02);
    ear.rotation.z = side * -0.18;
    group.add(ear);
    const eye = mesh(new THREE.SphereGeometry(0.041, 20, 14), 0x090705, 0.18, 0.03);
    eye.position.set(0.16 * side, 0.39, 0.335);
    group.add(eye);
    const glint = mesh(new THREE.SphereGeometry(0.008, 10, 8), 0xf8f1dc, 0.08, 0);
    glint.position.set(0.16 * side - 0.006, 0.404, 0.369);
    group.add(glint);
  });
  for (let i = 0; i < 7; i += 1) {
    const manePiece = mesh(new THREE.ConeGeometry(0.055, 0.22, 10), mane, 0.9, 0);
    manePiece.position.set(0, 0.7 - i * 0.1, -0.3 - i * 0.01);
    manePiece.rotation.x = -0.28;
    group.add(manePiece);
  }
  const neck = mesh(new THREE.CylinderGeometry(0.27, 0.4, 0.95, 28), coat);
  neck.position.y = -0.42;
  group.add(neck);
  const body = mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.7, 10), blanket);
  body.position.y = -0.85;
  group.add(body);
  return group;
}

function buildOstrich(target: Target) {
  const group = new THREE.Group();
  const [skin, feathers, vest] = target.palette;
  const neck = mesh(new THREE.CylinderGeometry(0.08, 0.13, 1.2, 24), skin);
  neck.position.y = -0.2;
  group.add(neck);
  const head = mesh(new THREE.SphereGeometry(0.24, 38, 28), skin);
  head.scale.set(0.78, 1, 0.82);
  head.position.y = 0.47;
  group.add(head);
  const beak = mesh(new THREE.ConeGeometry(0.12, 0.42, 10), 0xc48b3b);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.4, 0.35);
  beak.userData.lowerFace = true;
  group.add(beak);
  [-1, 1].forEach((side) => {
    const eye = mesh(new THREE.SphereGeometry(0.05, 10, 8), 0xf2e9d2);
    eye.position.set(0.1 * side, 0.53, 0.175);
    group.add(eye);
    const pupil = mesh(new THREE.SphereGeometry(0.022, 8, 6), 0x050505);
    pupil.position.set(0.1 * side, 0.53, 0.215);
    group.add(pupil);
  });
  const body = mesh(new THREE.SphereGeometry(0.45, 36, 26), feathers);
  body.scale.set(1, 0.85, 0.78);
  body.position.y = -0.85;
  group.add(body);
  const badge = addBox(group, [0.22, 0.18, 0.04], [0, -0.74, 0.36], vest);
  badge.rotation.x = -0.08;
  return group;
}

function addDamageAftermathRig(group: THREE.Group, species: Species) {
  const wound = new THREE.Group();
  wound.name = "damage-aftermath";
  wound.userData.damageVisual = true;
  wound.visible = false;
  const position: Record<Species, [number, number, number]> = {
    human: [0, 0.225, 0.13],
    horse: [0, 0.075, 0.08],
    ostrich: [0, 0.395, 0.04],
  };
  const scale: Record<Species, [number, number]> = {
    human: [0.23, 0.19],
    horse: [0.27, 0.16],
    ostrich: [0.105, 0.075],
  };
  wound.position.set(...position[species]);
  const [width, height] = scale[species];
  const cavity = new THREE.Mesh(
    new THREE.CircleGeometry(1, 19),
    new THREE.MeshPhysicalMaterial({
      color: 0x230202,
      roughness: 0.28,
      metalness: 0,
      clearcoat: 0.52,
    }),
  );
  cavity.scale.set(width, height, 1);
  wound.add(cavity);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.22, 9, 17),
    new THREE.MeshPhysicalMaterial({
      color: 0x74100c,
      roughness: 0.22,
      metalness: 0,
      clearcoat: 0.7,
    }),
  );
  ring.scale.set(width, height, Math.min(width, height));
  ring.position.z = 0.006;
  ring.rotation.z = 0.12;
  wound.add(ring);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const fragment = mesh(
      new THREE.ConeGeometry(0.014, 0.07, 6),
      index % 3 ? 0xd1c2a4 : 0x9a1711,
      0.38,
      0,
    );
    fragment.position.set(Math.cos(angle) * width * 0.93, Math.sin(angle) * height * 0.93, 0.02);
    fragment.rotation.z = angle - Math.PI / 2 + (index % 2 ? 0.18 : -0.12);
    wound.add(fragment);
  }
  group.add(wound);
}

function addLocalizedDamageVariants(group: THREE.Group, species: Species) {
  const variants: Partial<Record<HitZone, { position: [number, number, number]; scale: [number, number] }>> = species === "human"
    ? {
        "left-ear": { position: [-0.345, 0.32, 0.055], scale: [0.052, 0.095] },
        "right-ear": { position: [0.345, 0.32, 0.055], scale: [0.052, 0.095] },
        "left-eye": { position: [-0.12, 0.39, 0.337], scale: [0.072, 0.052] },
        "right-eye": { position: [0.12, 0.39, 0.337], scale: [0.072, 0.052] },
        nose: { position: [0, 0.265, 0.374], scale: [0.064, 0.092] },
        mouth: { position: [0, 0.115, 0.343], scale: [0.12, 0.06] },
      }
    : species === "horse"
      ? {
          "left-ear": { position: [-0.16, 0.72, 0.045], scale: [0.075, 0.15] },
          "right-ear": { position: [0.16, 0.72, 0.045], scale: [0.075, 0.15] },
          "left-eye": { position: [-0.16, 0.39, 0.372], scale: [0.072, 0.062] },
          "right-eye": { position: [0.16, 0.39, 0.372], scale: [0.072, 0.062] },
          muzzle: { position: [0, 0.15, 0.46], scale: [0.22, 0.15] },
        }
      : {
          "left-eye": { position: [-0.1, 0.53, 0.235], scale: [0.064, 0.06] },
          "right-eye": { position: [0.1, 0.53, 0.235], scale: [0.064, 0.06] },
          beak: { position: [0, 0.4, 0.435], scale: [0.14, 0.085] },
        };

  Object.entries(variants).forEach(([zone, definition]) => {
    if (!definition) return;
    const variant = new THREE.Group();
    variant.name = `damage-variant:${zone}`;
    variant.userData.damageVisual = true;
    variant.userData.damageZone = zone;
    variant.visible = false;
    variant.position.set(...definition.position);
    const cavity = new THREE.Mesh(
      new THREE.CircleGeometry(1, 22),
      new THREE.MeshPhysicalMaterial({ color: 0x260202, roughness: 0.22, clearcoat: 0.55, clearcoatRoughness: 0.18 }),
    );
    cavity.scale.set(definition.scale[0], definition.scale[1], 1);
    variant.add(cavity);
    const tornEdge = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.24, 8, 22),
      new THREE.MeshPhysicalMaterial({ color: 0x8e100a, roughness: 0.31, clearcoat: 0.5 }),
    );
    tornEdge.scale.set(definition.scale[0], definition.scale[1], Math.min(...definition.scale));
    tornEdge.position.z = 0.006;
    tornEdge.rotation.z = (zone.length % 5 - 2) * 0.12;
    variant.add(tornEdge);
    for (let index = 0; index < 7; index += 1) {
      const tissue = mesh(new THREE.CapsuleGeometry(0.004, 0.026 + (index % 3) * 0.008, 4, 7), index % 3 ? 0xa51a12 : 0xd1b99c, 0.34, 0);
      const angle = (index / 7) * Math.PI * 2;
      tissue.position.set(Math.cos(angle) * definition.scale[0] * 0.86, Math.sin(angle) * definition.scale[1] * 0.86, 0.014);
      tissue.rotation.z = angle;
      variant.add(tissue);
    }
    group.add(variant);
  });
}

function buildTarget(target: Target, quality: QualityProfile) {
  const group = target.species === "horse"
    ? buildHorse(target)
    : target.species === "ostrich"
      ? buildOstrich(target)
      : buildHuman(target, quality);
  const destructionLine: Record<Species, number> = { human: 0.17, horse: 0.08, ostrich: 0.24 };
  group.children.forEach((child) => {
    if (child.position.y > destructionLine[target.species]) child.userData.headVisual = true;
  });
  group.userData.dead = false;
  addDamageAftermathRig(group, target.species);
  addLocalizedDamageVariants(group, target.species);
  if (target.species === "human") {
    addHitZone(group, "face", [0, 0.34, 0.02], [0.34, 0.42, 0.31]);
    addHitZone(group, "left-ear", [-0.34, 0.32, 0.03], [0.07, 0.11, 0.065]);
    addHitZone(group, "right-ear", [0.34, 0.32, 0.03], [0.07, 0.11, 0.065]);
    addHitZone(group, "left-eye", [-0.12, 0.39, 0.315], [0.072, 0.055, 0.045]);
    addHitZone(group, "right-eye", [0.12, 0.39, 0.315], [0.072, 0.055, 0.045]);
    addHitZone(group, "nose", [0, 0.26, 0.345], [0.075, 0.105, 0.07]);
    addHitZone(group, "mouth", [0, 0.115, 0.315], [0.12, 0.055, 0.055]);
  } else if (target.species === "horse") {
    addHitZone(group, "face", [0, 0.34, 0.03], [0.29, 0.46, 0.38]);
    addHitZone(group, "left-ear", [-0.16, 0.72, -0.02], [0.1, 0.18, 0.09]);
    addHitZone(group, "right-ear", [0.16, 0.72, -0.02], [0.1, 0.18, 0.09]);
    addHitZone(group, "left-eye", [-0.16, 0.39, 0.345], [0.075, 0.065, 0.055]);
    addHitZone(group, "right-eye", [0.16, 0.39, 0.345], [0.075, 0.065, 0.055]);
    addHitZone(group, "muzzle", [0, 0.15, 0.36], [0.22, 0.15, 0.16]);
  } else {
    addHitZone(group, "face", [0, 0.47, 0.01], [0.2, 0.27, 0.22]);
    addHitZone(group, "left-eye", [-0.1, 0.53, 0.21], [0.065, 0.06, 0.05]);
    addHitZone(group, "right-eye", [0.1, 0.53, 0.21], [0.065, 0.06, 0.05]);
    addHitZone(group, "beak", [0, 0.4, 0.36], [0.14, 0.1, 0.2]);
  }
  group.position.set(0, -0.02, -1.46);
  group.rotation.y = target.detail % 2 ? -0.035 : 0.035;
  return group;
}

type ProofHeadAccessor = {
  bufferView: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: "SCALAR" | "VEC3";
};

type ProofHeadGlb = {
  accessors: ProofHeadAccessor[];
  bufferViews: Array<{ byteOffset?: number; byteStride?: number }>;
  meshes: Array<{ primitives: Array<{ attributes: { POSITION: number }; indices: number }> }>;
};

function parseProofHeadGlb(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
    throw new Error("Invalid proof-head GLB header");
  }

  let jsonBytes: Uint8Array | null = null;
  let binaryOffset = -1;
  let binaryLength = 0;
  for (let offset = 12; offset + 8 <= view.byteLength;) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + length;
    if (end > view.byteLength) throw new Error("Truncated proof-head GLB chunk");
    if (type === 0x4e4f534a) jsonBytes = new Uint8Array(buffer, start, length);
    if (type === 0x004e4942) {
      binaryOffset = start;
      binaryLength = length;
    }
    offset = end;
  }
  if (!jsonBytes || binaryOffset < 0) throw new Error("Proof-head GLB is missing JSON or geometry data");

  const source = JSON.parse(new TextDecoder().decode(jsonBytes).replace(/[\u0000 ]+$/g, "")) as ProofHeadGlb;
  const primitive = source.meshes[0]?.primitives[0];
  const positionAccessor = source.accessors[primitive?.attributes.POSITION];
  const indexAccessor = source.accessors[primitive?.indices];
  if (!primitive || !positionAccessor || !indexAccessor || positionAccessor.componentType !== 5126 || positionAccessor.type !== "VEC3") {
    throw new Error("Proof-head GLB has an unsupported mesh layout");
  }
  const positionView = source.bufferViews[positionAccessor.bufferView];
  const indexView = source.bufferViews[indexAccessor.bufferView];
  if (!positionView || !indexView || indexAccessor.type !== "SCALAR") {
    throw new Error("Proof-head GLB has missing buffer views");
  }

  const positionStride = positionView.byteStride ?? 12;
  const positionStart = binaryOffset + (positionView.byteOffset ?? 0) + (positionAccessor.byteOffset ?? 0);
  const positions = new Float32Array(positionAccessor.count * 3);
  for (let index = 0; index < positionAccessor.count; index += 1) {
    const sourceOffset = positionStart + index * positionStride;
    positions[index * 3] = view.getFloat32(sourceOffset, true);
    positions[index * 3 + 1] = view.getFloat32(sourceOffset + 4, true);
    positions[index * 3 + 2] = view.getFloat32(sourceOffset + 8, true);
  }

  const indexStart = binaryOffset + (indexView.byteOffset ?? 0) + (indexAccessor.byteOffset ?? 0);
  const bytesPerIndex = indexAccessor.componentType === 5123 ? 2 : indexAccessor.componentType === 5125 ? 4 : 0;
  if (!bytesPerIndex) throw new Error("Proof-head GLB uses unsupported index data");
  if (positionStart + positionAccessor.count * positionStride > binaryOffset + binaryLength
    || indexStart + indexAccessor.count * bytesPerIndex > binaryOffset + binaryLength) {
    throw new Error("Proof-head GLB geometry exceeds its binary chunk");
  }
  const indices = indexAccessor.componentType === 5123
    ? new Uint16Array(indexAccessor.count)
    : new Uint32Array(indexAccessor.count);
  for (let index = 0; index < indexAccessor.count; index += 1) {
    const sourceOffset = indexStart + index * bytesPerIndex;
    indices[index] = bytesPerIndex === 2 ? view.getUint16(sourceOffset, true) : view.getUint32(sourceOffset, true);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

let makeHumanHeadPromise: Promise<THREE.BufferGeometry | null> | null = null;

function loadMakeHumanHead() {
  makeHumanHeadPromise ??= fetch(new URL("assets/faces/makehuman-head.glb", document.baseURI))
    .then((response) => {
      if (!response.ok) throw new Error(`Proof-head request failed: ${response.status}`);
      return response.arrayBuffer();
    })
    .then(parseProofHeadGlb)
    .catch(() => null);
  return makeHumanHeadPromise;
}

async function hydrateMakeHumanHead(targetGroup: THREE.Group, target: Target) {
  if (target.species !== "human") return;
  targetGroup.userData.faceAssetStatus = "loading-makehuman";
  const sourceGeometry = await loadMakeHumanHead();
  if (!sourceGeometry || targetGroup.userData.disposed || targetGroup.userData.dead) {
    if (!targetGroup.userData.disposed) targetGroup.userData.faceAssetStatus = "procedural-fallback";
    return;
  }

  const model = new THREE.Group();
  const base = target.detail % 4;
  const baseScale: [number, number, number][] = [
    [0.137, 0.134, 0.142],
    [0.128, 0.141, 0.132],
    [0.134, 0.132, 0.151],
    [0.123, 0.145, 0.137],
  ];
  const skin = new THREE.Color(target.palette[0]);
  const random = seededRandom(target.detail + 701);
  const geometry = sourceGeometry.clone();
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    const warmth = (random() - 0.5) * 0.16;
    const pore = (random() - 0.5) * 0.09;
    const shade = skin.clone().offsetHSL(warmth * 0.1, pore, warmth + pore);
    colors[index * 3] = shade.r;
    colors[index * 3 + 1] = shade.g;
    colors[index * 3 + 2] = shade.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const face = new THREE.Mesh(
    geometry,
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.58 + (target.detail % 3) * 0.035,
      metalness: 0,
      clearcoat: 0.035,
      clearcoatRoughness: 0.86,
      sheen: 0.2,
      sheenColor: skin.clone().lerp(new THREE.Color(0xff5f50), 0.26),
      sheenRoughness: 0.8,
    }),
  );
  face.name = `makehuman-head-base-${base + 1}`;
  face.userData.headVisual = true;
  face.userData.damageVariant = "intact";
  face.castShadow = true;
  face.receiveShadow = true;
  model.add(face);
  model.scale.set(...baseScale[base]);
  model.position.set(0, -0.565 - (baseScale[base][1] - 0.134) * 6.6, -0.075);
  model.rotation.y = target.detail % 2 ? -0.012 : 0.012;
  model.userData.faceAsset = "makehuman-cc0-runtime-glb";
  targetGroup.children.forEach((child) => {
    if (child.userData.proceduralFace) child.visible = false;
  });
  targetGroup.add(model);
  targetGroup.userData.faceAssetStatus = "makehuman-loaded";
}

function grimeMaterial(base: number, accent: number, seed: number, repeatX = 3, repeatY = 3) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return material(base, 0.86, 0.02);
  context.fillStyle = new THREE.Color(base).getStyle();
  context.fillRect(0, 0, 256, 256);
  let value = seed * 991 + 17;
  const random = () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
  for (let i = 0; i < 180; i += 1) {
    const alpha = 0.025 + random() * 0.13;
    context.globalAlpha = alpha;
    context.fillStyle = new THREE.Color(i % 5 ? accent : 0x050505).getStyle();
    context.fillRect(random() * 256, random() * 256, 1 + random() * 38, 1 + random() * 5);
  }
  context.globalAlpha = 0.16;
  context.strokeStyle = new THREE.Color(accent).getStyle();
  context.lineWidth = 1;
  for (let i = 0; i < 12; i += 1) {
    context.beginPath();
    context.moveTo(random() * 256, random() * 256);
    context.lineTo(random() * 256, random() * 256);
    context.stroke();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ color: 0xffffff, map: texture, roughness: 0.9, metalness: 0.015 });
}

function buildLegacyEnvironment(target: Target, scene: THREE.Scene) {
  const group = new THREE.Group();
  const zone = Math.floor(target.detail / 4);
  const worldColors = [
    [0x151819, 0x2a3030, 0x5b1714],
    [0x181817, 0x34312b, 0x6f1c17],
    [0x0d1214, 0x263035, 0x8b251d],
    [0x211b17, 0x554634, 0x8c241b],
    [0x151313, 0x302727, 0x6a1817],
    [0x08090a, 0x1e2327, 0xb12620],
  ][zone] ?? [0x08090a, 0x202020, 0x8b1c18];
  scene.background = new THREE.Color(worldColors[0]);
  scene.fog = new THREE.FogExp2(worldColors[0], 0.085);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20, 8, 8), grimeMaterial(worldColors[1], worldColors[2], target.detail + 4, 7, 7));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.28;
  floor.receiveShadow = true;
  group.add(floor);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), grimeMaterial(worldColors[1], worldColors[0], target.detail + 31, 5, 3));
  backWall.position.set(0, 0.2, -4.35);
  backWall.receiveShadow = true;
  group.add(backWall);

  if (zone === 0) {
    [-1, 1].forEach((side) => addBox(group, [0.12, 4, 8], [2.5 * side, 0, -4], worldColors[1]));
    for (let i = 0; i < 6; i += 1) addBox(group, [0.1, 0.08, 3], [-1.45 + i * 0.58, 1.45, -3], i % 2 ? 0x2d3434 : worldColors[2]);
  } else if (zone === 1) {
    addBox(group, [7, 4, 0.12], [0, 0, -4], 0x2d2b28);
    for (let x = -2; x <= 2; x += 1) addBox(group, [0.85, 1.1, 0.04], [x * 1.05, 0.35, -3.92], x % 2 ? 0x17242a : 0x27383e);
    addBox(group, [4, 0.05, 1.2], [0, -0.85, -2.7], 0x171717);
  } else if (zone === 2) {
    addBox(group, [8, 3.2, 0.12], [0, 0.15, -4.2], 0x293338);
    addBox(group, [6, 0.35, 0.08], [0, 0.92, -4.05], worldColors[2]);
    for (let x = -3; x <= 3; x += 1) addBox(group, [0.06, 3.4, 0.1], [x, 0.2, -4], 0x111517);
    addBox(group, [8, 0.08, 0.1], [0, -0.92, -3.9], 0xd8d0b3);
  } else if (zone === 3) {
    for (let i = 0; i < 8; i += 1) {
      const crate = addBox(group, [0.7, 0.7, 0.7], [-2.4 + (i % 4) * 1.55, -0.9 + Math.floor(i / 4) * 0.73, -3.8], i % 2 ? 0x57452f : 0x3d3225);
      crate.rotation.y = (i % 3) * 0.08;
    }
    addBox(group, [0.12, 4, 0.12], [-2.8, 0, -3.2], 0x171411);
    addBox(group, [0.12, 4, 0.12], [2.8, 0, -3.2], 0x171411);
  } else if (zone === 4) {
    addBox(group, [7.5, 4, 0.12], [0, 0, -4.2], 0x302828);
    addBox(group, [2.8, 1.9, 0.05], [-1.6, 0.25, -4.1], 0x181f22);
    addBox(group, [2.8, 1.9, 0.05], [1.6, 0.25, -4.1], 0x181f22);
    addBox(group, [1.3, 0.08, 0.6], [0, -0.65, -3.05], 0x4b382c);
  } else {
    for (let x = -3; x <= 3; x += 1) addBox(group, [0.16, 3.6, 0.16], [x, 0, -3.7], x === 0 ? worldColors[2] : 0x22272b);
    addBox(group, [7, 0.08, 0.3], [0, 1.2, -3.7], worldColors[2]);
    addBox(group, [1.5, 0.35, 0.7], [0, -0.8, -3], 0x191c1f);
  }

  const redLight = new THREE.PointLight(worldColors[2], 2.4, 8, 2);
  redLight.position.set(-2.2, 1.2, -1.5);
  group.add(redLight);
  const rimLight = new THREE.PointLight(0x9eb3b5, 1.7, 7, 2);
  rimLight.position.set(2.4, 0.8, -2.3);
  group.add(rimLight);
  for (let i = 0; i < 18; i += 1) {
    const mote = mesh(new THREE.SphereGeometry(0.008 + (i % 3) * 0.003, 8, 6), i % 4 ? 0x6b6961 : worldColors[2], 0.9, 0);
    mote.position.set(-2.8 + ((i * 71) % 53) / 9, -0.8 + ((i * 37) % 29) / 12, -1.7 - ((i * 23) % 24) / 8);
    group.add(mote);
  }
  return group;
}

type EnvironmentSurface = "brick" | "concrete";
type EnvironmentTextureChannel = "diffuse" | "normal" | "rough";
type InstanceSpec = { position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number] };

const ENV_TEXTURE_CACHE = new Map<string, Promise<THREE.Texture | null>>();

function environmentAssetName(surface: EnvironmentSurface, channel: EnvironmentTextureChannel, size: 512 | 1024) {
  return `${surface}-${channel}-${size}.jpg`;
}

function loadCachedEnvironmentTexture(surface: EnvironmentSurface, channel: EnvironmentTextureChannel, size: 512 | 1024) {
  const name = environmentAssetName(surface, channel, size);
  const cached = ENV_TEXTURE_CACHE.get(name);
  if (cached) return cached;
  const pending = new Promise<THREE.Texture | null>((resolve) => {
    const url = new URL(`assets/materials/${name}`, document.baseURI).href;
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        if (channel === "diffuse") texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });
  ENV_TEXTURE_CACHE.set(name, pending);
  return pending;
}

async function hydrateEnvironmentMaterial(
  finish: THREE.MeshStandardMaterial,
  surface: EnvironmentSurface,
  quality: QualityProfile,
  repeat: [number, number],
) {
  const [diffuse, normal, rough] = await Promise.all([
    loadCachedEnvironmentTexture(surface, "diffuse", quality.textureSize),
    loadCachedEnvironmentTexture(surface, "normal", quality.textureSize),
    loadCachedEnvironmentTexture(surface, "rough", quality.textureSize),
  ]);
  if (finish.userData.disposed || !diffuse) return;
  const prepare = (source: THREE.Texture | null) => {
    if (!source) return null;
    const texture = source.clone();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
    texture.anisotropy = quality.tier === "high" ? 8 : 4;
    texture.needsUpdate = true;
    return texture;
  };
  finish.map?.dispose();
  finish.map = prepare(diffuse);
  finish.normalMap = prepare(normal);
  finish.roughnessMap = prepare(rough);
  finish.normalScale.set(0.72, 0.72);
  finish.needsUpdate = true;
  finish.userData.assetStatus = "cc0-loaded";
}

function environmentMaterial(
  surface: EnvironmentSurface,
  base: number,
  accent: number,
  seed: number,
  quality: QualityProfile,
  repeat: [number, number],
) {
  const finish = grimeMaterial(base, accent, seed, repeat[0], repeat[1]);
  finish.userData.assetStatus = "procedural-fallback";
  void hydrateEnvironmentMaterial(finish, surface, quality, repeat);
  return finish;
}

function preloadEnvironmentAssets(kind: Target["environmentKind"], quality: QualityProfile) {
  const surfaces: EnvironmentSurface[] = kind === "alley" ? ["brick", "concrete"] : ["concrete"];
  surfaces.forEach((surface) => {
    (["diffuse", "normal", "rough"] as EnvironmentTextureChannel[]).forEach((channel) => {
      void loadCachedEnvironmentTexture(surface, channel, quality.textureSize);
    });
  });
}

function addInstancedBoxes(group: THREE.Group, color: number, instances: InstanceSpec[], roughness = 0.78, metalness = 0.03) {
  if (instances.length === 0) return;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const finish = material(color, roughness, metalness);
  const instanced = new THREE.InstancedMesh(geometry, finish, instances.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  instances.forEach((entry, index) => {
    quaternion.setFromEuler(new THREE.Euler(...(entry.rotation ?? [0, 0, 0])));
    matrix.compose(new THREE.Vector3(...entry.position), quaternion, new THREE.Vector3(...entry.scale));
    instanced.setMatrixAt(index, matrix);
  });
  instanced.castShadow = true;
  instanced.receiveShadow = true;
  group.add(instanced);
}

function addRain(group: THREE.Group, quality: QualityProfile) {
  const count = quality.tier === "high" ? 620 : quality.tier === "medium" ? 360 : 170;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = -4 + Math.random() * 8;
    positions[index * 3 + 1] = -1 + Math.random() * 4.7;
    positions[index * 3 + 2] = -4 + Math.random() * 5.2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const rain = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xc9d8dc, size: 0.012, transparent: true, opacity: 0.46 }));
  rain.name = "adaptive-rain";
  group.add(rain);
}

function buildEnvironment(target: Target, scene: THREE.Scene, quality: QualityProfile) {
  try {
    const group = new THREE.Group();
    group.userData.environmentKind = target.environmentKind;
    const palette = {
      alley: [0x111719, 0x273033, 0x8f231d],
      warehouse: [0x171816, 0x393b36, 0xb2a264],
      cubicle: [0x252522, 0x6b675b, 0x8e2720],
      finale: [0x07090b, 0x20262a, 0xc1261f],
    }[target.environmentKind];
    scene.background = new THREE.Color(palette[0]);
    scene.fog = new THREE.FogExp2(palette[0], target.environmentKind === "finale" ? 0.105 : 0.075);

    const floorFinish = environmentMaterial("concrete", palette[1], palette[2], target.detail + 7, quality, [7, 7]);
    floorFinish.roughness = target.environmentKind === "alley" ? 0.42 : 0.82;
    floorFinish.metalness = target.environmentKind === "alley" ? 0.18 : 0.015;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20, 4, 4), floorFinish);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.28;
    floor.receiveShadow = quality.shadows;
    group.add(floor);

    if (target.environmentKind === "alley") {
      const brickFinish = environmentMaterial("brick", 0x3d3330, 0x17191a, target.detail + 31, quality, [4.5, 2.6]);
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), brickFinish);
      backWall.position.set(0, 0.2, -4.35);
      backWall.receiveShadow = quality.shadows;
      group.add(backWall);
      addInstancedBoxes(group, 0x202629, [
        { position: [-2.72, 0.05, -3.75], scale: [0.18, 4.2, 1.1] },
        { position: [2.72, 0.05, -3.75], scale: [0.18, 4.2, 1.1] },
        { position: [-1.95, -0.68, -3.42], scale: [1.15, 1.05, 0.75] },
      ], 0.52, 0.34);
      addInstancedBoxes(group, 0x4b5556, Array.from({ length: 7 }, (_, index) => ({
        position: [-2.1 + index * 0.7, 1.45, -4.05] as [number, number, number],
        scale: [0.08, 0.08, 3.2] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
      })), 0.33, 0.68);
      for (let index = 0; index < 5; index += 1) {
        const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.34 + index * 0.09, 24), new THREE.MeshPhysicalMaterial({ color: 0x152126, roughness: 0.08, metalness: 0.25, clearcoat: 0.8 }));
        puddle.rotation.x = -Math.PI / 2;
        puddle.scale.y = 0.45;
        puddle.position.set(-2.1 + index * 1.03, -1.267, -1.8 - (index % 2) * 0.9);
        group.add(puddle);
      }
      addRain(group, quality);
    } else if (target.environmentKind === "warehouse") {
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), environmentMaterial("concrete", 0x4a4b45, 0x1b1d1c, target.detail + 31, quality, [5, 3]));
      backWall.position.set(0, 0.2, -4.35);
      backWall.receiveShadow = quality.shadows;
      group.add(backWall);
      const shelfParts: InstanceSpec[] = [];
      [-2.5, 2.5].forEach((x) => {
        [-1, 1].forEach((offset) => shelfParts.push({ position: [x + offset * 0.5, 0, -3.2], scale: [0.08, 3.1, 0.08] }));
        [-0.95, -0.1, 0.75].forEach((y) => shelfParts.push({ position: [x, y, -3.2], scale: [1.1, 0.08, 0.65] }));
      });
      addInstancedBoxes(group, 0x34383a, shelfParts, 0.34, 0.7);
      addInstancedBoxes(group, 0x594833, Array.from({ length: 10 }, (_, index) => ({
        position: [-2.7 + (index % 5) * 1.35, -0.88 + Math.floor(index / 5) * 0.72, -3.7] as [number, number, number],
        scale: [0.72, 0.68, 0.62] as [number, number, number],
        rotation: [0, (index % 3 - 1) * 0.06, 0] as [number, number, number],
      })), 0.88, 0.01);
      addInstancedBoxes(group, 0xd9d4bc, [-2.1, 0, 2.1].map((x) => ({ position: [x, 1.72, -2.7], scale: [1.35, 0.055, 0.34] })), 0.38, 0.05);
    } else if (target.environmentKind === "cubicle") {
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), environmentMaterial("concrete", 0x706c60, 0x302f2b, target.detail + 31, quality, [5, 3]));
      backWall.position.set(0, 0.2, -4.35);
      group.add(backWall);
      const partitions: InstanceSpec[] = [];
      [-2.55, -1.3, 1.3, 2.55].forEach((x, index) => {
        partitions.push({ position: [x, -0.38, -3.25 + (index % 2) * 0.48], scale: [0.08, 1.65, 1.7] });
      });
      [-3.1, 3.1].forEach((x) => partitions.push({ position: [x, -0.38, -2.55], scale: [1.5, 1.65, 0.08] }));
      addInstancedBoxes(group, 0x777469, partitions, 0.92, 0.01);
      addInstancedBoxes(group, 0x3f3027, [-2.55, -1.3, 1.3, 2.55].map((x) => ({ position: [x, -0.67, -2.72], scale: [0.96, 0.08, 0.78] })), 0.78, 0.02);
      addInstancedBoxes(group, 0xe5e0ca, [-2.2, 0, 2.2].map((x) => ({ position: [x, 1.72, -2.9], scale: [1.45, 0.05, 0.34] })), 0.38, 0.05);
      for (let index = 0; index < 4; index += 1) {
        const monitor = addBox(group, [0.48, 0.34, 0.05], [-2.55 + index * 1.7, -0.3, -2.33], 0x101719);
        monitor.rotation.x = -0.08;
      }
    } else {
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), environmentMaterial("concrete", 0x20262a, 0x07090b, target.detail + 31, quality, [5, 3]));
      backWall.position.set(0, 0.2, -4.35);
      group.add(backWall);
      addInstancedBoxes(group, 0x171c20, Array.from({ length: 9 }, (_, index) => ({
        position: [-3.2 + index * 0.8, 0.05, -4.05] as [number, number, number],
        scale: [0.16, 3.65, 0.18] as [number, number, number],
      })), 0.28, 0.7);
      addInstancedBoxes(group, 0xa51b17, [
        { position: [0, 1.37, -3.92], scale: [6.5, 0.065, 0.16] },
        { position: [0, -0.95, -3.92], scale: [6.5, 0.035, 0.12] },
      ], 0.36, 0.42);
      const halo = new THREE.SpotLight(0xe8ece7, 4.8, 6, Math.PI / 8, 0.7, 1.5);
      halo.position.set(0, 2.6, -0.8);
      halo.target.position.set(0, 0.25, -1.8);
      group.add(halo, halo.target);
    }

    const redLight = new THREE.PointLight(palette[2], target.environmentKind === "finale" ? 3.2 : 2.25, 8, 2);
    redLight.position.set(-2.2, 1.2, -1.5);
    group.add(redLight);
    const rimLight = new THREE.PointLight(target.environmentKind === "cubicle" ? 0xfff2cf : 0x9eb3b5, 1.85, 7, 2);
    rimLight.position.set(2.4, 0.8, -2.3);
    group.add(rimLight);
    return group;
  } catch {
    return buildLegacyEnvironment(target, scene);
  }
}

const WEAPON_POSES: Record<WeaponKind, { position: [number, number, number]; rotation: [number, number, number]; scale: number }> = {
  revolver: { position: [0.52, -0.42, -0.58], rotation: [-0.1, -0.13, -0.055], scale: 1.14 },
  smg: { position: [0.48, -0.39, -0.64], rotation: [-0.085, -0.1, -0.04], scale: 1.02 },
  shotgun: { position: [0.44, -0.39, -0.7], rotation: [-0.07, -0.085, -0.035], scale: 1.04 },
};

function addGunHand(gun: THREE.Group, longGrip = false) {
  const glove = material(0x171513, 0.92, 0.01);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.19, 30, 22), glove);
  hand.scale.set(0.82, longGrip ? 1.08 : 1.2, 0.76);
  hand.position.set(0.02, longGrip ? -0.34 : -0.42, longGrip ? -0.02 : 0.02);
  gun.add(hand);
  for (let i = 0; i < 3; i += 1) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.13, 6, 12), glove);
    finger.rotation.x = Math.PI / 2;
    finger.position.set(-0.065 + i * 0.065, longGrip ? -0.26 : -0.3, -0.13 - i * 0.014);
    gun.add(finger);
  }
}

function buildGun(kind: WeaponKind) {
  const gun = new THREE.Group();
  const black = material(0x08090a, 0.23, 0.78);
  const steel = material(0x3d4143, 0.2, 0.9);
  const silver = material(0xa9aaa5, 0.24, 0.88);
  const wornSteel = material(0x777773, 0.32, 0.82);
  let muzzleZ = -1.125;

  if (kind === "revolver") {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.83, 32), silver);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.025, -0.68);
    gun.add(barrel);
    const topRib = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.72), wornSteel);
    topRib.position.set(0, 0.095, -0.62);
    gun.add(topRib);
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.22, 12), silver);
    cylinder.rotation.z = Math.PI / 2;
    cylinder.position.set(0, -0.01, -0.23);
    gun.add(cylinder);
    for (let index = 0; index < 6; index += 1) {
      const chamber = mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.23, 12), 0x18191a, 0.5, 0.6);
      const angle = (index / 6) * Math.PI * 2;
      chamber.rotation.z = Math.PI / 2;
      chamber.position.set(Math.cos(angle) * 0.071, Math.sin(angle) * 0.071 - 0.01, -0.23);
      gun.add(chamber);
    }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.42), silver);
    frame.position.set(0, -0.015, -0.11);
    gun.add(frame);
    const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.31, 8, 22), material(0x241a16, 0.72, 0.06));
    grip.position.set(0, -0.27, 0.05);
    grip.rotation.x = -0.3;
    gun.add(grip);
  } else if (kind === "smg") {
    muzzleZ = -1.08;
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.24, 0.72, 2, 2, 4), black);
    receiver.position.set(0, 0.015, -0.38);
    gun.add(receiver);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.11, 0.8), steel);
    upper.position.set(0, 0.135, -0.45);
    gun.add(upper);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.55, 24), black);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.87);
    gun.add(barrel);
    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.18), steel);
    magazine.position.set(0, -0.31, -0.22);
    magazine.rotation.x = -0.16;
    gun.add(magazine);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.55), black);
    stock.position.set(0, -0.02, 0.24);
    stock.rotation.x = -0.06;
    gun.add(stock);
    const frontGrip = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.22, 7, 16), black);
    frontGrip.position.set(0, -0.19, -0.66);
    frontGrip.rotation.x = -0.15;
    gun.add(frontGrip);
  } else {
    muzzleZ = -1.32;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 1.42, 28), steel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.06, -0.66);
    gun.add(barrel);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 1.08, 24), black);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, -0.055, -0.57);
    gun.add(tube);
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.23, 0.52), steel);
    receiver.position.set(0, 0.015, 0.04);
    gun.add(receiver);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.38), material(0x2d211a, 0.74, 0.03));
    pump.position.set(0, -0.06, -0.59);
    gun.add(pump);
    for (let index = 0; index < 5; index += 1) {
      const groove = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.012, 0.018), black);
      groove.position.set(0, -0.03 + index * 0.025, -0.73 + index * 0.065);
      gun.add(groove);
    }
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.72), material(0x3a261a, 0.7, 0.02));
    stock.position.set(0, -0.13, 0.52);
    stock.rotation.x = -0.16;
    gun.add(stock);
  }

  const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(kind === "shotgun" ? 0.068 : 0.057, 0.012, 10, 30), wornSteel);
  muzzleRing.position.set(0, kind === "shotgun" ? 0.06 : 0.025, muzzleZ);
  gun.add(muzzleRing);
  const muzzleDark = new THREE.Mesh(new THREE.CircleGeometry(kind === "shotgun" ? 0.058 : 0.047, 30), material(0x010101, 0.95, 0));
  muzzleDark.position.set(0, kind === "shotgun" ? 0.06 : 0.025, muzzleZ - 0.014);
  muzzleDark.rotation.y = Math.PI;
  gun.add(muzzleDark);
  addGunHand(gun, kind !== "revolver");

  const pose = WEAPON_POSES[kind];
  gun.position.set(...pose.position);
  gun.rotation.set(...pose.rotation);
  gun.scale.setScalar(pose.scale);
  gun.userData.muzzleY = kind === "shotgun" ? 0.06 : 0.025;
  gun.userData.muzzleZ = muzzleZ;

  const muzzle = new THREE.PointLight(kind === "shotgun" ? 0xffc071 : 0xff9f42, 0, kind === "shotgun" ? 4 : 3, 2);
  muzzle.position.set(0, gun.userData.muzzleY, muzzleZ + 0.08);
  gun.add(muzzle);
  const muzzleMesh = mesh(new THREE.IcosahedronGeometry(kind === "shotgun" ? 0.14 : 0.09, 0), 0xffb34e, 0.1, 0);
  muzzleMesh.position.set(0, gun.userData.muzzleY, muzzleZ - 0.01);
  muzzleMesh.visible = false;
  gun.add(muzzleMesh);
  return { gun, muzzle, muzzleMesh };
}

function createSplatTexture(seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const random = seededRandom(seed + 313);
  const drawBurst = (radius: number, color: string, alpha: number, spikes: number) => {
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.beginPath();
    for (let index = 0; index < spikes; index += 1) {
      const angle = (index / spikes) * Math.PI * 2;
      const length = radius * (0.58 + random() * 0.62) * (index % 5 === 0 ? 1.34 : 1);
      const x = 128 + Math.cos(angle) * length;
      const y = 128 + Math.sin(angle) * length;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
  };
  drawBurst(91, "#4d0503", 0.96, 36);
  drawBurst(67, "#9c130d", 0.88, 29);
  drawBurst(38, "#d93427", 0.56, 23);
  for (let index = 0; index < 36; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = 58 + random() * 85;
    const radius = 1.5 + random() * (index % 7 === 0 ? 9 : 4.5);
    context.globalAlpha = 0.58 + random() * 0.4;
    context.fillStyle = index % 4 ? "#760906" : "#c72118";
    context.beginPath();
    context.ellipse(128 + Math.cos(angle) * distance, 128 + Math.sin(angle) * distance, radius, radius * (0.65 + random()), angle, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createMistCloud(runtime: Runtime, origin: THREE.Vector3, target: Target, zone: HitZone, layer: number) {
  const weapon = WEAPON_PROFILES[target.weaponKind];
  const budget = runtime.reducedMotion
    ? 34
    : Math.round(runtime.quality.mistParticles * (zone === "face" ? 1 : 0.72) * weapon.goreMultiplier);
  const count = Math.max(12, Math.round(budget * (layer === 0 ? 0.62 : 0.38)));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 3);
  const palette = [new THREE.Color(0x4a0202), new THREE.Color(0xa20d08), new THREE.Color(0xe12b20)];
  const sideForce = zone === "left-ear" ? -1.25 : zone === "right-ear" ? 1.25 : 0;
  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    positions[offset] = origin.x + (Math.random() - 0.5) * (zone === "face" ? 0.34 : 0.15);
    positions[offset + 1] = origin.y + (Math.random() - 0.5) * (zone === "face" ? 0.42 : 0.18);
    positions[offset + 2] = origin.z + (Math.random() - 0.5) * 0.12;
    const shade = palette[index % palette.length].clone().multiplyScalar(0.72 + Math.random() * 0.4);
    colors[offset] = shade.r;
    colors[offset + 1] = shade.g;
    colors[offset + 2] = shade.b;
    const speed = 0.55 + Math.random() * (layer === 0 ? 2.7 : 1.65);
    velocity[offset] = sideForce + (Math.random() - 0.5) * speed * 1.15;
    velocity[offset + 1] = (Math.random() - 0.28) * speed;
    velocity[offset + 2] = 0.5 + Math.random() * speed * 1.6;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const finish = new THREE.PointsMaterial({
    size: layer === 0 ? 0.032 : 0.062,
    sizeAttenuation: true,
    transparent: true,
    opacity: layer === 0 ? 0.78 : 0.92,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.NormalBlending,
  });
  const points = new THREE.Points(geometry, finish);
  points.frustumCulled = false;
  runtime.scene.add(points);
  runtime.mistClouds.push({ points, velocity, life: layer === 0 ? 0.82 : 1.05, gravity: 2.2 });
}

function addWallSplat(runtime: Runtime, target: Target, origin: THREE.Vector3, zone: HitZone) {
  const texture = createSplatTexture(target.detail * 17 + zone.length * 11);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.92, depthWrite: false }));
  sprite.position.set(
    THREE.MathUtils.clamp(origin.x * 2.1 + (Math.random() - 0.5) * 0.75, -2.4, 2.4),
    THREE.MathUtils.clamp(origin.y * 1.45 + (Math.random() - 0.5) * 0.42, -0.8, 1.5),
    -4.12,
  );
  const scale = zone === "face" ? 1.8 : 1.25;
  sprite.scale.set(scale * (0.8 + Math.random() * 0.5), scale, 1);
  runtime.scene.add(sprite);
  runtime.aftermath.push(sprite);
}

function addForegroundSheets(runtime: Runtime, target: Target, zone: HitZone, origin: THREE.Vector3) {
  if (runtime.reducedMotion) return;
  for (let index = 0; index < runtime.quality.foregroundSheets; index += 1) {
    const texture = createSplatTexture(target.detail * 37 + index * 19 + zone.length);
    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55 + index * 0.12, 0.48 + (index % 2) * 0.19),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide }),
    );
    sheet.castShadow = false;
    sheet.position.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * 0.24, (Math.random() - 0.5) * 0.2, 0.08 + index * 0.02));
    sheet.rotation.z = Math.random() * Math.PI;
    runtime.scene.add(sheet);
    runtime.shards.push({
      mesh: sheet,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 1.35, (Math.random() - 0.25) * 1.2, 0.65 + Math.random() * 1.5),
      spin: new THREE.Vector3(0, 0, (Math.random() - 0.5) * 4),
      life: 0.78 + Math.random() * 0.22,
      gravity: 0.8,
      shrink: false,
    });
  }
}

function applyLocalizedDamage(runtime: Runtime, target: Target, shot: Shot) {
  const zone = shot.zone ?? "face";
  runtime.scene.updateMatrixWorld(true);
  const zoneTarget = runtime.hitTargets.find((item) => item.userData.hitZone === zone);
  const fallback = zoneTarget?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(0, 0.31, -1.42);
  const origin = shot.point ? new THREE.Vector3(...shot.point) : fallback;
  const direction = shot.direction ? new THREE.Vector3(...shot.direction) : new THREE.Vector3(0, 0, -1);
  const destroysLowerFace = ["mouth", "muzzle", "beak"].includes(zone);
  const catastrophic = zone === "face";
  runtime.target?.traverse((child) => {
    if ((catastrophic && child.userData.headVisual) || child.name.startsWith("hit-zone:") || (destroysLowerFace && child.userData.lowerFace)) child.visible = false;
    if (child.userData.damageVisual) {
      child.visible = child.userData.damageZone ? child.userData.damageZone === zone : catastrophic || destroysLowerFace;
    }
  });
  if (runtime.target) runtime.target.userData.dead = true;
  runtime.hitShake = 1;

  createMistCloud(runtime, origin, target, zone, 0);
  createMistCloud(runtime, origin, target, zone, 1);
  addWallSplat(runtime, target, origin, zone);
  addForegroundSheets(runtime, target, zone, origin);

  const colors = zone.endsWith("eye")
    ? [0xe5dfd2, 0x33271d, 0x5d0705, 0xb51610, target.palette[0]]
    : [0x3a0202, 0x6e0805, 0xb9271f, target.palette[0], 0xd7c8a8];
  const count = runtime.reducedMotion ? 12 : Math.round(runtime.quality.chunks * (zone === "face" ? 1 : 0.75));
  const spreadX = zone === "face" ? 0.36 : 0.17;
  const spreadY = zone === "face" ? 0.5 : 0.24;
  const sideForce = zone === "left-ear" ? -1.05 : zone === "right-ear" ? 1.05 : 0;
  const towardCamera = direction.clone().multiplyScalar(-1.1);
  for (let index = 0; index < count; index += 1) {
    const size = 0.022 + Math.random() * 0.078;
    const tooth = (zone === "mouth" || zone === "face") && index % 9 === 0;
    const geometry = tooth
      ? new THREE.BoxGeometry(size * 0.55, size, size * 0.34)
      : index % 4 === 0
        ? new THREE.TetrahedronGeometry(size * 0.88, 0)
        : index % 5 === 0
          ? new THREE.CapsuleGeometry(size * 0.22, size * 1.6, 4, 7)
          : new THREE.SphereGeometry(size * 0.58, 9, 6);
    const shardMesh = mesh(geometry, tooth ? 0xeadfc8 : colors[index % colors.length], 0.3, 0);
    shardMesh.castShadow = index < 12;
    shardMesh.receiveShadow = false;
    shardMesh.position.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * spreadX, (Math.random() - 0.5) * spreadY, (Math.random() - 0.5) * 0.14));
    runtime.scene.add(shardMesh);
    runtime.shards.push({
      mesh: shardMesh,
      velocity: towardCamera.clone().multiplyScalar(0.65 + Math.random() * 1.2).add(new THREE.Vector3(sideForce + (Math.random() - 0.5) * 1.85, 0.15 + Math.random() * 1.65, 0.35 + Math.random() * 1.4)),
      spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
      life: 0.9 + Math.random() * 0.35,
      gravity: 3.15,
    });
  }

  if (["left-ear", "right-ear", "nose", "muzzle", "beak"].includes(zone)) {
    const detachedGeometry = zone.endsWith("ear")
      ? new THREE.SphereGeometry(1, 24, 16)
      : zone === "beak"
        ? new THREE.ConeGeometry(0.11, 0.34, 10)
        : new THREE.ConeGeometry(zone === "muzzle" ? 0.13 : 0.055, zone === "muzzle" ? 0.24 : 0.15, 12);
    const detachedColor = zone === "beak" ? 0xc48b3b : target.palette[0];
    const detached = mesh(detachedGeometry, detachedColor, 0.48, 0);
    if (zone.endsWith("ear")) detached.scale.set(0.045, 0.1, 0.03);
    if (zone === "nose" || zone === "muzzle" || zone === "beak") detached.rotation.x = Math.PI / 2;
    detached.position.copy(origin);
    runtime.scene.add(detached);
    runtime.shards.push({
      mesh: detached,
      velocity: new THREE.Vector3(
        zone === "left-ear" ? -1.8 : zone === "right-ear" ? 1.8 : (Math.random() - 0.5) * 0.8,
        0.72 + Math.random() * 0.5,
        1.85 + Math.random() * 0.55,
      ),
      spin: new THREE.Vector3(6, 9, 7),
      life: 1.2,
      gravity: 2.6,
    });
  }

  if (zone === "face" || zone.endsWith("eye")) {
    const eyeCount = zone === "face" ? 2 : 1;
    for (let index = 0; index < eyeCount; index += 1) {
      const side = eyeCount === 2 ? (index === 0 ? -1 : 1) : zone === "left-eye" ? -1 : 1;
      const eyeball = mesh(new THREE.SphereGeometry(0.047, 24, 16), 0xe7dfcf, 0.26, 0);
      const iris = mesh(new THREE.SphereGeometry(0.019, 16, 10), target.detail % 3 === 1 ? 0x43574b : 0x423023, 0.2, 0);
      iris.position.z = 0.041;
      eyeball.add(iris);
      const cord = mesh(new THREE.CapsuleGeometry(0.006, 0.12, 5, 8), 0x7a0a08, 0.35, 0);
      cord.rotation.x = Math.PI / 2;
      cord.position.z = -0.075;
      eyeball.add(cord);
      eyeball.position.copy(origin).add(new THREE.Vector3(side * 0.035, index * 0.025, 0));
      runtime.scene.add(eyeball);
      runtime.shards.push({
        mesh: eyeball,
        velocity: new THREE.Vector3(side * (0.65 + index * 0.2), 0.72 + index * 0.28, 2.05 + index * 0.35),
        spin: new THREE.Vector3(7 + index, 4, side * 9),
        life: 1.2,
        gravity: 2.4,
      });
    }
  }
}

function createMissSparks(runtime: Runtime, aim: Aim) {
  const point = new THREE.Vector3(aim.x, aim.y, 0.35).unproject(runtime.camera);
  const direction = point.sub(runtime.camera.position).normalize();
  const origin = runtime.camera.position.clone().addScaledVector(direction, 2.4);
  const count = runtime.reducedMotion ? 5 : 11;
  for (let i = 0; i < count; i += 1) {
    const spark = mesh(new THREE.IcosahedronGeometry(0.014 + Math.random() * 0.018, 0), i % 3 ? 0xd6b27b : 0x8a2d22, 0.35, 0.25);
    spark.position.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08, 0));
    runtime.scene.add(spark);
    runtime.shards.push({
      mesh: spark,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.3) * 0.6, 0.35 + Math.random() * 0.5),
      spin: new THREE.Vector3(4, 6, 8),
      life: 0.45 + Math.random() * 0.25,
    });
  }
}

function ThreeStage({
  target,
  shot,
  reducedMotion,
  quality,
  aimRef,
  hitTestRef,
}: {
  target: Target;
  shot: Shot;
  reducedMotion: boolean;
  quality: QualityProfile;
  aimRef: MutableRefObject<Aim>;
  hitTestRef: MutableRefObject<HitTest | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const targetRef = useRef(target);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 80);
    camera.position.set(0, 0.08, 0);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
    renderer.shadowMap.enabled = quality.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.42;

    const ambient = new THREE.HemisphereLight(0xd8dfd8, 0x281818, 1.72);
    scene.add(ambient);
    const key = new THREE.SpotLight(0xffeee0, 5.4, 7, Math.PI / 4.7, 0.72, 1.45);
    key.position.set(0.8, 2.2, 0.1);
    key.target.position.set(0, 0, -1.8);
    key.castShadow = true;
    key.shadow.mapSize.set(quality.shadowMapSize || 256, quality.shadowMapSize || 256);
    scene.add(key, key.target);
    const faceFill = new THREE.DirectionalLight(0xffd9c4, 1.35);
    faceFill.position.set(-1.4, 0.45, 1.1);
    scene.add(faceFill);
    const softFront = new THREE.PointLight(0xffead7, 1.8, 4.5, 1.65);
    softFront.position.set(0.2, 0.15, 0.55);
    scene.add(softFront);

    const gunRig = buildGun(target.weaponKind);
    camera.add(gunRig.gun);
    scene.add(camera);

    const runtime: Runtime = {
      scene, camera, renderer, target: null, hitTargets: [], environment: null,
      gun: gunRig.gun, muzzle: gunRig.muzzle, muzzleMesh: gunRig.muzzleMesh, weaponKind: target.weaponKind, quality,
      shards: [], mistClouds: [], aftermath: [], recoil: 0, shotFlash: 0, burstCooldown: 0, burstsRemaining: 0,
      hitShake: 0, targetEnter: 1, frame: 0, reducedMotion,
    };
    runtimeRef.current = runtime;
    const raycaster = new THREE.Raycaster();
    const aimVector = new THREE.Vector2();
    hitTestRef.current = () => {
      if (runtime.hitTargets.length === 0 || !runtime.target?.visible || runtime.target.userData.dead) return { hit: false, zone: null };
      aimVector.set(aimRef.current.x, aimRef.current.y);
      raycaster.setFromCamera(aimVector, camera);
      const intersections = raycaster.intersectObjects(runtime.hitTargets, false);
      if (intersections.length === 0) return { hit: false, zone: null };
      const preciseHit = intersections.find((entry) => entry.object.userData.hitZone !== "face");
      const intersection = preciseHit ?? intersections[0];
      const zone = intersection.object.userData.hitZone as HitZone;
      return {
        hit: true,
        zone,
        point: intersection.point.toArray() as [number, number, number],
        direction: raycaster.ray.direction.toArray() as [number, number, number],
      };
    };

    const resize = () => {
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let previous = performance.now();
    const animate = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.04);
      previous = now;
      const t = now / 1000;
      const aim = aimRef.current;
      const tracking = Math.min(1, delta * 11);
      if (runtime.target?.visible && !runtime.target.userData.dead) {
        runtime.targetEnter = Math.max(0, runtime.targetEnter - delta * (runtime.reducedMotion ? 8 : 2.8));
        const entrance = targetRef.current.entryKind === "static" ? 0 : runtime.targetEnter * runtime.targetEnter;
        runtime.target.position.x = targetRef.current.entryKind === "left" ? -entrance * 1.28 : 0;
        runtime.target.position.y = -0.02 + Math.sin(t * 1.45 + targetRef.current.detail) * 0.012 - (targetRef.current.entryKind === "below" ? entrance * 1.15 : 0);
        runtime.target.rotation.y = (targetRef.current.detail % 2 ? -0.035 : 0.035) + Math.sin(t * 0.7 + targetRef.current.detail) * 0.018;
        runtime.target.traverse((child) => {
          if (!child.name.startsWith("living-eye:")) return;
          child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, -aim.x * 0.18, tracking * 0.45);
          child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, aim.y * 0.12, tracking * 0.45);
          const blink = Math.sin(t * 0.72 + targetRef.current.detail * 2.1) > 0.992 ? 0.22 : 1;
          child.scale.y = THREE.MathUtils.lerp(child.scale.y, 0.035 * blink, tracking * 1.8);
        });
      }
      const rain = runtime.environment?.getObjectByName("adaptive-rain") as THREE.Points | undefined;
      if (rain) {
        const rainPosition = rain.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let index = 0; index < rainPosition.count; index += 1) {
          const nextY = rainPosition.getY(index) - delta * (2.6 + (index % 5) * 0.22);
          rainPosition.setY(index, nextY < -1.2 ? 3.5 : nextY);
        }
        rainPosition.needsUpdate = true;
      }
      runtime.recoil *= Math.pow(0.002, delta);
      runtime.hitShake *= Math.pow(0.012, delta);
      const pose = WEAPON_POSES[runtime.weaponKind];
      runtime.gun.position.x = THREE.MathUtils.lerp(runtime.gun.position.x, pose.position[0] + aim.x * 0.14, tracking);
      runtime.gun.position.y = THREE.MathUtils.lerp(runtime.gun.position.y, pose.position[1] + aim.y * 0.085, tracking);
      runtime.gun.position.z = pose.position[2] + runtime.recoil * 0.3;
      runtime.gun.rotation.x = THREE.MathUtils.lerp(runtime.gun.rotation.x, pose.rotation[0] + aim.y * 0.085 + runtime.recoil * 0.42, tracking);
      runtime.gun.rotation.y = THREE.MathUtils.lerp(runtime.gun.rotation.y, pose.rotation[1] - aim.x * 0.12, tracking);
      runtime.gun.rotation.z = THREE.MathUtils.lerp(runtime.gun.rotation.z, pose.rotation[2] - aim.x * 0.035, tracking);
      runtime.burstCooldown -= delta;
      if (runtime.burstsRemaining > 0 && runtime.burstCooldown <= 0) {
        runtime.shotFlash = 1;
        runtime.recoil = Math.max(runtime.recoil, WEAPON_PROFILES[runtime.weaponKind].recoil * 0.68);
        runtime.burstsRemaining -= 1;
        runtime.burstCooldown = 0.065;
      }
      runtime.shotFlash = Math.max(0, runtime.shotFlash - delta * 11);
      runtime.muzzle.intensity = runtime.shotFlash * (runtime.weaponKind === "shotgun" ? 34 : 22);
      runtime.muzzleMesh.visible = runtime.shotFlash > 0.2;
      runtime.muzzleMesh.rotation.z += delta * 18;

      runtime.shards.forEach((shard) => {
        shard.life -= delta * 0.9;
        shard.velocity.y -= delta * (shard.gravity ?? 2.9);
        shard.mesh.position.addScaledVector(shard.velocity, delta);
        shard.mesh.rotation.x += shard.spin.x * delta;
        shard.mesh.rotation.y += shard.spin.y * delta;
        shard.mesh.rotation.z += shard.spin.z * delta;
        if (shard.shrink !== false) shard.mesh.scale.setScalar(Math.max(0, Math.min(1, shard.life)));
      });
      runtime.shards = runtime.shards.filter((shard) => {
        if (shard.life > 0) return true;
        disposeObject(shard.mesh);
        return false;
      });

      runtime.mistClouds.forEach((cloud) => {
        cloud.life -= delta;
        const attribute = cloud.points.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let index = 0; index < attribute.count; index += 1) {
          const offset = index * 3;
          cloud.velocity[offset + 1] -= cloud.gravity * delta;
          attribute.setXYZ(
            index,
            attribute.getX(index) + cloud.velocity[offset] * delta,
            attribute.getY(index) + cloud.velocity[offset + 1] * delta,
            attribute.getZ(index) + cloud.velocity[offset + 2] * delta,
          );
          cloud.velocity[offset] *= 0.992;
          cloud.velocity[offset + 2] *= 0.986;
        }
        attribute.needsUpdate = true;
        (cloud.points.material as THREE.PointsMaterial).opacity = Math.max(0, Math.min(0.9, cloud.life * 1.25));
      });
      runtime.mistClouds = runtime.mistClouds.filter((cloud) => {
        if (cloud.life > 0) return true;
        disposeObject(cloud.points);
        return false;
      });

      const shakeX = runtime.reducedMotion ? 0 : (Math.random() - 0.5) * runtime.hitShake * 0.045;
      const shakeY = runtime.reducedMotion ? 0 : (Math.random() - 0.5) * runtime.hitShake * 0.035;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, aim.x * 0.045 + shakeX + (runtime.reducedMotion ? 0 : Math.sin(t * 0.5) * 0.004), tracking * 0.55);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.08 + aim.y * 0.025 + shakeY, tracking * 0.55);
      camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -aim.x * 0.018, tracking * 0.5);
      camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, aim.y * 0.012, tracking * 0.5);
      renderer.render(scene, camera);
      runtime.frame = requestAnimationFrame(animate);
    };
    runtime.frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(runtime.frame);
      observer.disconnect();
      disposeObject(runtime.target);
      disposeObject(runtime.environment);
      runtime.shards.forEach((shard) => disposeObject(shard.mesh));
      runtime.mistClouds.forEach((cloud) => disposeObject(cloud.points));
      runtime.aftermath.forEach((item) => disposeObject(item));
      disposeObject(runtime.gun);
      renderer.dispose();
      runtimeRef.current = null;
      hitTestRef.current = null;
    };
  }, [aimRef, hitTestRef, quality, reducedMotion, target.weaponKind]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    targetRef.current = target;
    runtime.reducedMotion = reducedMotion;
    runtime.quality = quality;
    runtime.renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
    runtime.renderer.shadowMap.enabled = quality.shadows;
    if (runtime.weaponKind !== target.weaponKind) {
      disposeObject(runtime.gun);
      const nextGun = buildGun(target.weaponKind);
      runtime.gun = nextGun.gun;
      runtime.muzzle = nextGun.muzzle;
      runtime.muzzleMesh = nextGun.muzzleMesh;
      runtime.weaponKind = target.weaponKind;
      runtime.camera.add(runtime.gun);
    }
    runtime.shards.forEach((shard) => disposeObject(shard.mesh));
    runtime.shards = [];
    runtime.mistClouds.forEach((cloud) => disposeObject(cloud.points));
    runtime.mistClouds = [];
    runtime.aftermath.forEach((item) => disposeObject(item));
    runtime.aftermath = [];
    disposeObject(runtime.target);
    disposeObject(runtime.environment);
    runtime.environment = buildEnvironment(target, runtime.scene, quality);
    runtime.scene.add(runtime.environment);
    const nextTarget = SEQUENCES[target.detail + 1];
    if (nextTarget) preloadEnvironmentAssets(nextTarget.environmentKind, quality);
    runtime.target = buildTarget(target, quality);
    runtime.targetEnter = 1;
    runtime.hitTargets = [];
    runtime.target.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name.startsWith("hit-zone:")) runtime.hitTargets.push(child);
    });
    runtime.scene.add(runtime.target);
    void hydrateMakeHumanHead(runtime.target, target);
  }, [target, quality, reducedMotion]);

  useEffect(() => {
    if (shot.tick === 0) return;
    const runtime = runtimeRef.current;
    if (!runtime || !runtime.target) return;
    const weapon = WEAPON_PROFILES[targetRef.current.weaponKind];
    runtime.recoil = weapon.recoil;
    runtime.shotFlash = 1;
    runtime.burstsRemaining = Math.max(0, weapon.visualBursts - 1);
    runtime.burstCooldown = 0.065;
    if (shot.hit) {
      applyLocalizedDamage(runtime, targetRef.current, shot);
    } else {
      createMissSparks(runtime, aimRef.current);
    }
  }, [aimRef, shot]);

  return <canvas ref={canvasRef} className="three-stage" aria-hidden="true" />;
}

function useShotAudio(muted: boolean) {
  const contextRef = useRef<AudioContext | null>(null);

  const ensureContext = useCallback(() => {
    if (muted) return null;
    const AudioContextClass = window.AudioContext;
    contextRef.current ??= new AudioContextClass();
    if (contextRef.current.state === "suspended") void contextRef.current.resume();
    return contextRef.current;
  }, [muted]);

  const playShot = useCallback((hit: boolean, species: Species, zone: HitZone, weaponKind: WeaponKind) => {
    const context = ensureContext();
    if (!context) return;
    const now = context.currentTime;
    const lengthSeconds = weaponKind === "shotgun" ? 0.31 : weaponKind === "smg" ? 0.17 : 0.22;
    const length = Math.floor(context.sampleRate * lengthSeconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(weaponKind === "shotgun" ? 1350 : weaponKind === "smg" ? 2600 : 1800, now);
    filter.frequency.exponentialRampToValueAtTime(weaponKind === "shotgun" ? 72 : 120, now + lengthSeconds);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(weaponKind === "shotgun" ? 0.82 : weaponKind === "smg" ? 0.46 : 0.62, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + lengthSeconds);
    noise.connect(filter).connect(gain).connect(context.destination);
    noise.start(now);
    noise.stop(now + lengthSeconds + 0.01);

    const thump = context.createOscillator();
    const thumpGain = context.createGain();
    thump.type = "triangle";
    thump.frequency.setValueAtTime(weaponKind === "shotgun" ? 66 : weaponKind === "smg" ? 118 : 92, now);
    thump.frequency.exponentialRampToValueAtTime(weaponKind === "shotgun" ? 28 : 38, now + 0.16);
    thumpGain.gain.setValueAtTime(weaponKind === "shotgun" ? 0.72 : weaponKind === "smg" ? 0.33 : 0.5, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    thump.connect(thumpGain).connect(context.destination);
    thump.start(now);
    thump.stop(now + 0.19);

    if (hit) {
      const impactAt = now + 0.028;
      const impactLength = Math.floor(context.sampleRate * 0.16);
      const impactBuffer = context.createBuffer(1, impactLength, context.sampleRate);
      const impactData = impactBuffer.getChannelData(0);
      for (let index = 0; index < impactLength; index += 1) {
        const envelope = Math.pow(1 - index / impactLength, 1.15);
        const wetPulse = Math.sin(index * 0.17) * 0.34 + (Math.random() * 2 - 1);
        impactData[index] = wetPulse * envelope * (zone === "face" ? 0.72 : 0.52);
      }
      const impact = context.createBufferSource();
      impact.buffer = impactBuffer;
      const impactFilter = context.createBiquadFilter();
      impactFilter.type = "lowpass";
      impactFilter.frequency.value = species === "ostrich" ? 820 : species === "horse" ? 540 : 680;
      impactFilter.Q.value = 0.65;
      const impactGain = context.createGain();
      impactGain.gain.setValueAtTime(0.46, impactAt);
      impactGain.gain.exponentialRampToValueAtTime(0.0001, impactAt + 0.16);
      impact.connect(impactFilter).connect(impactGain).connect(context.destination);
      impact.start(impactAt);
      impact.stop(impactAt + 0.17);
    }
  }, [ensureContext]);

  const playStinger = useCallback(() => {
    const context = ensureContext();
    if (!context) return;
    const start = context.currentTime;
    [110, 146.83, 73.42].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 2 ? "sawtooth" : "square";
      oscillator.frequency.setValueAtTime(frequency, start + index * 0.11);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, start + 0.32 + index * 0.11);
      gain.gain.setValueAtTime(0.0001, start + index * 0.11);
      gain.gain.exponentialRampToValueAtTime(index === 2 ? 0.08 : 0.045, start + 0.02 + index * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34 + index * 0.11);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + index * 0.11);
      oscillator.stop(start + 0.36 + index * 0.11);
    });
  }, [ensureContext]);

  useEffect(() => () => {
    if (contextRef.current) void contextRef.current.close();
  }, []);

  return { ensureContext, playShot, playStinger };
}

export default function CloseRangeGame() {
  const [phase, setPhase] = useState<Phase>("title");
  const [targetIndex, setTargetIndex] = useState(0);
  const [introLine, setIntroLine] = useState(0);
  const [shot, setShot] = useState<Shot>({ tick: 0, hit: false, zone: null });
  const [feedback, setFeedback] = useState("");
  const [feedbackDetail, setFeedbackDetail] = useState("");
  const [feedbackKind, setFeedbackKind] = useState<"hit" | "miss">("hit");
  const [feedbackTick, setFeedbackTick] = useState(0);
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(WEAPON_PROFILES.revolver.capacity);
  const [shotsFired, setShotsFired] = useState(0);
  const [specialHits, setSpecialHits] = useState(0);
  const [partsFound, setPartsFound] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>("solo");
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [playerScores, setPlayerScores] = useState<[number, number]>([0, 0]);
  const [muted, setMuted] = useState(false);
  const [qualityMode, setQualityMode] = useState<QualityMode>(() => {
    if (typeof window === "undefined") return "auto";
    const stored = window.localStorage.getItem("close-range-quality");
    return stored === "low" || stored === "high" ? stored : "auto";
  });
  const [qualityTier, setQualityTier] = useState<QualityTier>("medium");
  const [reducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const lockedRef = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);
  const aimReadoutRef = useRef<HTMLDivElement>(null);
  const aimRef = useRef<Aim>({ x: 0, y: 0 });
  const hitTestRef = useRef<HitTest | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const reloadTimerRef = useRef<number | null>(null);
  const chapterTimerRef = useRef<number | null>(null);
  const { ensureContext, playShot, playStinger } = useShotAudio(muted);
  const target = SEQUENCES[targetIndex];
  const weapon = WEAPON_PROFILES[target.weaponKind];
  const quality = QUALITY_PROFILES[qualityTier];
  const chapter = chapterForSequence(targetIndex);

  useEffect(() => {
    const resolve = () => {
      const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
      setQualityTier(resolveQualityTier(qualityMode, {
        coarsePointer: window.matchMedia("(pointer: coarse)").matches,
        viewportWidth: window.innerWidth,
        deviceMemory: navigatorWithMemory.deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency,
      }));
    };
    window.localStorage.setItem("close-range-quality", qualityMode);
    resolve();
    window.addEventListener("resize", resolve);
    return () => window.removeEventListener("resize", resolve);
  }, [qualityMode]);

  const begin = useCallback((mode: GameMode = "solo") => {
    ensureContext();
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    if (reloadTimerRef.current) window.clearTimeout(reloadTimerRef.current);
    if (chapterTimerRef.current) window.clearTimeout(chapterTimerRef.current);
    setGameMode(mode);
    setActivePlayer(1);
    setPlayerScores([0, 0]);
    setTargetIndex(0);
    setScore(0);
    setAmmo(WEAPON_PROFILES.revolver.capacity);
    setShotsFired(0);
    setSpecialHits(0);
    setPartsFound([]);
    setIntroLine(0);
    setFeedback("");
    setFeedbackDetail("");
    setFeedbackKind("hit");
    aimRef.current = { x: 0, y: 0 };
    if (crosshairRef.current) {
      crosshairRef.current.style.left = "50%";
      crosshairRef.current.style.top = "50%";
    }
    lockedRef.current = false;
    setPhase("intro");
  }, [ensureContext]);

  useEffect(() => {
    if (phase !== "intro") return;
    const delay = reducedMotion ? 800 : 1450;
    const timer = window.setTimeout(() => {
      if (introLine < INTRO.length - 1) setIntroLine((value) => value + 1);
      else {
        lockedRef.current = true;
        setPhase("chapter");
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [introLine, phase, reducedMotion]);

  const skipIntro = useCallback(() => {
    lockedRef.current = true;
    setPhase("chapter");
  }, []);

  const skipChapter = useCallback(() => {
    if (chapterTimerRef.current) window.clearTimeout(chapterTimerRef.current);
    lockedRef.current = false;
    setPhase("playing");
  }, []);

  useEffect(() => {
    if (phase !== "chapter") return;
    playStinger();
    chapterTimerRef.current = window.setTimeout(skipChapter, reducedMotion ? 900 : 2600);
    return () => {
      if (chapterTimerRef.current) window.clearTimeout(chapterTimerRef.current);
    };
  }, [phase, playStinger, reducedMotion, skipChapter, targetIndex]);

  const startReload = useCallback((weaponKind: WeaponKind) => {
    if (reloadTimerRef.current) window.clearTimeout(reloadTimerRef.current);
    lockedRef.current = true;
    setPhase("reloading");
    reloadTimerRef.current = window.setTimeout(() => {
      setAmmo(WEAPON_PROFILES[weaponKind].capacity);
      lockedRef.current = false;
      setPhase("playing");
    }, 700);
  }, []);

  const fire = useCallback(() => {
    if (phase !== "playing" || lockedRef.current) return;
    if (ammo < weapon.ammoCost) {
      startReload(target.weaponKind);
      return;
    }
    const hitResult = hitTestRef.current?.() ?? { hit: false, zone: null };
    const hit = hitResult.hit;
    const zone = hitResult.zone ?? "face";
    const nextAmmo = ammo - weapon.ammoCost;
    playShot(hit, target.species, zone, target.weaponKind);
    setShot((value) => ({
      tick: value.tick + 1,
      hit,
      zone: hit ? zone : null,
      point: hit ? hitResult.point : undefined,
      direction: hit ? hitResult.direction : undefined,
    }));
    setShotsFired((value) => value + 1);
    setAmmo(nextAmmo);
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    if (!hit) {
      setFeedbackKind("miss");
      setFeedback("CLOSER.");
      setFeedbackDetail("NO FACIAL CONTACT");
      setFeedbackTick((value) => value + 1);
      feedbackTimerRef.current = window.setTimeout(() => {
        setFeedback("");
        setFeedbackDetail("");
      }, reducedMotion ? 260 : 620);
      if (nextAmmo < weapon.ammoCost) startReload(target.weaponKind);
      return;
    }
    lockedRef.current = true;
    setFeedbackKind("hit");
    const category = zoneCategory(zone);
    const points = ZONE_POINTS[zone] + targetIndex * 125;
    setFeedback(zone === "face" ? PRAISE[targetIndex % PRAISE.length] : ZONE_FEEDBACK[zone]);
    setFeedbackDetail(`+${points.toLocaleString()} // ${zoneLabel(zone)}`);
    setPartsFound((value) => value.includes(category) ? value : [...value, category]);
    if (zone !== "face") setSpecialHits((value) => value + 1);
    setFeedbackTick((value) => value + 1);
    setScore((value) => value + points);
    if (gameMode === "couch") {
      setPlayerScores((value) => activePlayer === 1 ? [value[0] + points, value[1]] : [value[0], value[1] + points]);
    }
    crosshairRef.current?.classList.remove("is-on-target");
    setPhase("transition");
    transitionTimerRef.current = window.setTimeout(() => {
      if (targetIndex >= SEQUENCES.length - 1) {
        setPhase("complete");
      } else {
        const nextIndex = targetIndex + 1;
        const nextTarget = SEQUENCES[nextIndex];
        const nextWeapon = WEAPON_PROFILES[nextTarget.weaponKind];
        const weaponChanged = nextTarget.weaponKind !== target.weaponKind;
        setTargetIndex(nextIndex);
        if (weaponChanged) setAmmo(nextWeapon.capacity);
        if (gameMode === "couch") setActivePlayer((value) => value === 1 ? 2 : 1);
        setFeedback("");
        setFeedbackDetail("");
        if (chapterForSequence(nextIndex)) {
          if (!weaponChanged && nextAmmo < nextWeapon.ammoCost) setAmmo(nextWeapon.capacity);
          lockedRef.current = true;
          setPhase("chapter");
        } else if (!weaponChanged && nextAmmo < nextWeapon.ammoCost) {
          startReload(nextTarget.weaponKind);
        } else {
          lockedRef.current = false;
          setPhase("playing");
        }
      }
    }, reducedMotion ? 560 : 1450);
  }, [activePlayer, ammo, gameMode, phase, playShot, reducedMotion, startReload, target, targetIndex, weapon]);

  useEffect(() => () => {
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    if (reloadTimerRef.current) window.clearTimeout(reloadTimerRef.current);
    if (chapterTimerRef.current) window.clearTimeout(chapterTimerRef.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.code === "Space" || event.code === "Enter") && phase === "playing") {
        event.preventDefault();
        fire();
      }
      if (event.code === "Space" && phase === "title") {
        event.preventDefault();
        begin("solo");
      }
      if (event.code === "Space" && phase === "complete") {
        event.preventDefault();
        begin(gameMode);
      }
      if ((event.code === "Space" || event.code === "Enter" || event.code === "Escape") && phase === "chapter") {
        event.preventDefault();
        skipChapter();
      }
      if (event.code === "Escape" && phase === "intro") skipIntro();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [begin, fire, gameMode, phase, skipChapter, skipIntro]);

  const rank = useMemo(() => {
    if (score >= 56000) return "CULTURAL LANDMARK";
    if (score >= 48000) return "UNFLINCHING";
    return "POINT-BLANK";
  }, [score]);

  const bloodDrops = useMemo(() => Array.from({ length: qualityTier === "high" ? 42 : qualityTier === "low" ? 18 : 30 }, (_, index) => {
    const random = seededRandom(shot.tick * 43 + index * 17 + 5);
    return {
      x: `${2 + random() * 96}%`,
      y: `${1 + random() * 94}%`,
      size: `${0.35 + random() * (index % 7 === 0 ? 4.8 : 2.25)}cqw`,
      rotation: `${-45 + random() * 90}deg`,
      delay: `${Math.floor(random() * 170)}ms`,
    };
  }), [qualityTier, shot.tick]);

  const updateAim = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const frame = frameRef.current;
    if (!frame) return;
    const bounds = frame.getBoundingClientRect();
    const localX = THREE.MathUtils.clamp(event.clientX - bounds.left, 0, bounds.width);
    const localY = THREE.MathUtils.clamp(event.clientY - bounds.top, 0, bounds.height);
    aimRef.current.x = (localX / Math.max(bounds.width, 1)) * 2 - 1;
    aimRef.current.y = -((localY / Math.max(bounds.height, 1)) * 2 - 1);
    if (crosshairRef.current) {
      crosshairRef.current.style.left = `${localX}px`;
      crosshairRef.current.style.top = `${localY}px`;
    }
    const result = hitTestRef.current?.();
    crosshairRef.current?.classList.toggle("is-on-target", Boolean(result?.hit));
    if (aimReadoutRef.current) {
      aimReadoutRef.current.dataset.active = result?.hit ? "true" : "false";
      const label = aimReadoutRef.current.querySelector("strong");
      if (label) label.textContent = result?.zone ? zoneLabel(result.zone) : "NO FACE";
    }
  }, []);

  const handleStagePointer = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    updateAim(event);
    fire();
  };

  const cycleQuality = () => {
    setQualityMode((value) => value === "auto" ? "low" : value === "low" ? "high" : "auto");
  };

  return (
    <main className={`game-shell phase-${phase}`}>
      <div
        className={`game-frame ${phase === "transition" && shot.hit ? "is-hit" : ""}`}
        ref={frameRef}
        onPointerMove={updateAim}
        onPointerDown={handleStagePointer}
      >
        <ThreeStage target={target} shot={shot} reducedMotion={reducedMotion} quality={quality} aimRef={aimRef} hitTestRef={hitTestRef} />
        <div className="vignette" />
        <div className="film-grain" />
        {phase === "transition" && shot.hit && (
          <div key={`blood-${shot.tick}`} className="blood-lens is-active" aria-hidden="true">
            {bloodDrops.map((drop, index) => (
              <i
                key={index}
                className="blood-drop"
                style={{
                  "--x": drop.x,
                  "--y": drop.y,
                  "--s": drop.size,
                  "--r": drop.rotation,
                  "--d": drop.delay,
                } as CSSProperties}
              />
            ))}
          </div>
        )}

        <button className="sound-toggle" type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted}>
          SOUND {muted ? "OFF" : "ON"}
        </button>
        <button className="quality-toggle" type="button" onClick={cycleQuality} aria-label={`Visual quality ${qualityMode}, resolved ${qualityTier}`}>
          VISUAL {qualityMode.toUpperCase()} <span>{qualityTier.toUpperCase()}</span>
        </button>

        {(phase === "playing" || phase === "reloading" || phase === "transition") && (
          <section className="hud" aria-label="Game status">
            <div ref={crosshairRef} className="crosshair" aria-hidden="true"><i /><b /></div>
            <div
              key={`${feedbackTick}-${feedback}`}
              className={`praise praise-${feedbackKind} ${feedback ? "is-visible" : ""}`}
              role="status"
              aria-live="polite"
            >{feedback}</div>
            <div className={`impact-detail ${feedbackDetail ? "is-visible" : ""}`}>{feedbackDetail}</div>
            <div className="score-counter" aria-label={`Score ${score}`}>{score}</div>
            <div className="location-slate" key={targetIndex}>
              <span>{String(targetIndex + 1).padStart(2, "0")} / 24</span>
              <strong>{target.codename}</strong>
              <small>{target.location}</small>
            </div>
            <div className="victim-dialogue" key={`dialogue-${targetIndex}-${phase}`}>
              <span>{phase === "transition" ? "PRESTIGE NARRATOR" : "WELL-DEVELOPED CHARACTER"}</span>
              <strong>{phase === "transition" ? NARRATOR_BEATS[targetIndex % NARRATOR_BEATS.length] : VICTIM_DIALOGUE[targetIndex]}</strong>
            </div>
            {(target.species === "horse" || target.species === "ostrich") && (
              <div className="side-mission-bug" key={`side-${targetIndex}`}>
                <small>HIDDEN EXTRA DISCOVERED</small>
                <strong>ANIMAL FACE SIDE MISSION</strong>
              </div>
            )}
            {gameMode === "couch" && (
              <div className="player-turn">
                <span>UNPARALLELED MULTIPLAYER</span>
                <strong>PLAYER {activePlayer}{" // "}{playerScores[activePlayer - 1].toLocaleString()}</strong>
              </div>
            )}
            <div className="anatomy-strip" aria-label="Available facial targets">
              <span>THE ENTIRE HEAD IS OPEN{" // "}{99_999 - targetIndex} FACES REMAIN</span>
              <div>{availableZoneCategories(target.species).map((zone) => <i key={zone}>{zone}</i>)}</div>
            </div>
            <div className="aim-readout" ref={aimReadoutRef} data-active="false">
              <span>AIM AREA</span><strong>FACE IS OPEN</strong>
            </div>
            <div className={`weapon-mark weapon-${target.weaponKind}`} aria-label={weapon.label}>
              <i /><b /><span>{weapon.label}</span>
            </div>
            <div className="fire-prompt">{phase === "reloading" ? "700 MS NARRATIVE RELOAD" : "MOVE TO AIM  //  CLICK, TAP, OR SPACE TO FIRE"}</div>
            <div className="ammo-readout" aria-label={`${ammo} of ${weapon.capacity} rounds`}>
              <div className={`shell-stack shells-${target.weaponKind}`}>{Array.from({ length: weapon.capacity }, (_, index) => <i key={index} className={index < ammo ? "loaded" : ""} />)}</div>
              <strong>{ammo}</strong><span>/{weapon.capacity}</span>
            </div>
          </section>
        )}

        {phase === "title" && (
          <section className="title-screen">
            <p className="eyebrow">THE MOST IMPORTANT GAME OF THE YEAR // AN UNOFFICIAL 3D TRIBUTE</p>
            <h1><span>CLOSE</span><span>RANGE</span></h1>
            <div className="review-stamp review-one"><strong>“INCREDIBLE”</strong><small>OGN.COM</small></div>
            <div className="review-stamp review-two"><strong>“BREATHTAKING”</strong><small>GAME INSIDER</small></div>
            <p className="tagline">START THE EPIC JOURNEY NOW!</p>
            <p className="open-face-copy">SHOOT THE FACE. OR THE EAR. THE ENTIRE HEAD IS OPEN.</p>
            <div className="mode-buttons">
              <button className="primary-button" type="button" onClick={() => begin("solo")}><span>PLAY ONLINE NOW</span><kbd>SPACE</kbd></button>
              <button className="secondary-button" type="button" onClick={() => begin("couch")}><span>UNPARALLELED MULTIPLAYER</span><small>TAKE TURNS ON ONE MOUSE</small></button>
            </div>
            <div className="title-meta"><span>24 SEQUENCES</span><span>OPEN-ENDED FACIAL COMBAT</span><span>POINT-BLANK 3D</span></div>
            <p className="attribution">Fan-made browser tribute. Original concept by The Onion. No affiliation.</p>
          </section>
        )}

        {phase === "intro" && (
          <section className="intro-screen">
            <div className="intro-rule" />
            <p>CASE FILE // 01</p>
            <h2 key={introLine}>{INTRO[introLine]}</h2>
            <div className="intro-progress">{INTRO.map((_, index) => <i key={index} className={index <= introLine ? "active" : ""} />)}</div>
            <button type="button" className="skip-button" onClick={skipIntro}>SKIP BRIEFING <kbd>ESC</kbd></button>
          </section>
        )}

        {phase === "chapter" && (
          <section className="chapter-screen" key={`chapter-${targetIndex}`}>
            <div className="chapter-static" aria-hidden="true" />
            <p>{(chapter ?? CHAPTERS[0]).eyebrow}</p>
            <h2>{(chapter ?? CHAPTERS[0]).headline}</h2>
            <strong>{(chapter ?? CHAPTERS[0]).copy}</strong>
            <div className="chapter-loadout">
              <span>{target.location}</span>
              <b>{weapon.label}</b>
            </div>
            <button type="button" className="skip-button" onClick={skipChapter}>SKIP TRANSMISSION <kbd>SPACE</kbd></button>
          </section>
        )}

        {phase === "complete" && (
          <section className="complete-screen has-stinger">
            <p className="eyebrow">CAMPAIGN COMPLETE</p>
            <h2>CONGRATULATIONS.</h2>
            <p className="complete-copy">
              You have explored the full open-ended geography of the human face.
              {gameMode === "couch" && (
                playerScores[0] === playerScores[1]
                  ? " The unparalleled interaction ends in a tie. Both couches win."
                  : ` Player ${playerScores[0] > playerScores[1] ? 1 : 2} wins the unparalleled interaction.`
              )}
            </p>
            <div className="result-grid result-grid-four">
              <div><small>SEQUENCES</small><strong>24 / 24</strong></div>
              <div><small>SHOTS</small><strong>{shotsFired}</strong></div>
              <div><small>SPECIAL HITS</small><strong>{specialHits}</strong></div>
              <div><small>PARTS FOUND</small><strong>{partsFound.length}</strong></div>
            </div>
            <p className="result-rating">RATING // <strong>{rank}</strong></p>
            <div className="sequel-stinger">
              <small>NEXT FALL // A COMPLETELY DIFFERENT KIND OF DEPTH</small>
              <strong>CLOSE RANGE 2</strong>
              <span>CHAINSAW DAWN</span>
            </div>
            <button className="primary-button" type="button" onClick={() => begin(gameMode)}><span>DOWNLOAD MORE FACES</span><kbd>SPACE</kbd></button>
          </section>
        )}

        <div className={`impact-flash ${phase === "transition" ? "active" : ""}`} />
        <div key={`static-${shot.tick}-${phase}`} className={`static-wipe ${phase === "transition" || phase === "reloading" ? "active" : ""}`} aria-hidden="true" />
      </div>
    </main>
  );
}
