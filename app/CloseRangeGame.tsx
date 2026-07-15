"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";

type Phase = "title" | "intro" | "playing" | "transition" | "complete";
type Species = "human" | "horse" | "ostrich" | "robot";

type Target = {
  codename: string;
  species: Species;
  location: string;
  palette: [number, number, number];
  weapon: string;
  detail: number;
};

const TARGETS: Target[] = [
  { codename: "The Lookout", species: "human", location: "SOUTH DOCKS", palette: [0xb98a68, 0x171615, 0x7d1d19], weapon: "9MM SERVICE PISTOL", detail: 0 },
  { codename: "The Driver", species: "human", location: "SOUTH DOCKS", palette: [0x825a43, 0x090909, 0x384252], weapon: "9MM SERVICE PISTOL", detail: 1 },
  { codename: "The Accountant", species: "human", location: "SOUTH DOCKS", palette: [0xd0a17e, 0x3a261e, 0x273142], weapon: "9MM SERVICE PISTOL", detail: 2 },
  { codename: "The Witness", species: "human", location: "SOUTH DOCKS", palette: [0x9d684e, 0x16110e, 0x5c1617], weapon: "9MM SERVICE PISTOL", detail: 3 },
  { codename: "The Negotiator", species: "human", location: "MIDTOWN OFFICES", palette: [0xe0b28c, 0x402319, 0x20242c], weapon: ".45 TACTICAL", detail: 4 },
  { codename: "The Assistant", species: "human", location: "MIDTOWN OFFICES", palette: [0x704733, 0x111111, 0x6c3229], weapon: ".45 TACTICAL", detail: 5 },
  { codename: "The Consultant", species: "human", location: "MIDTOWN OFFICES", palette: [0xb77b5c, 0x261611, 0x263543], weapon: ".45 TACTICAL", detail: 6 },
  { codename: "The Director", species: "human", location: "MIDTOWN OFFICES", palette: [0xc99370, 0x6b6258, 0x202020], weapon: ".45 TACTICAL", detail: 7 },
  { codename: "The Courier", species: "human", location: "RED LINE PLATFORM", palette: [0x7f513b, 0x12100e, 0x31383c], weapon: "12-GAUGE", detail: 8 },
  { codename: "The Tourist", species: "human", location: "RED LINE PLATFORM", palette: [0xd2a07d, 0xb09855, 0x482126], weapon: "12-GAUGE", detail: 9 },
  { codename: "The Inspector", species: "human", location: "RED LINE PLATFORM", palette: [0xa87355, 0x30231d, 0x1c2630], weapon: "12-GAUGE", detail: 10 },
  { codename: "The Horse", species: "horse", location: "RED LINE PLATFORM", palette: [0x7c4e32, 0x21150f, 0x4b1515], weapon: "12-GAUGE", detail: 11 },
  { codename: "The Mechanic", species: "human", location: "WESTERN YARD", palette: [0x8d5d44, 0x221711, 0x485159], weapon: "COMPACT SMG", detail: 12 },
  { codename: "The Foreman", species: "human", location: "WESTERN YARD", palette: [0xcc9975, 0x4d2f20, 0x3c332b], weapon: "COMPACT SMG", detail: 13 },
  { codename: "The Ostrich", species: "ostrich", location: "WESTERN YARD", palette: [0xc7a17f, 0x2d2925, 0x551514], weapon: "COMPACT SMG", detail: 14 },
  { codename: "The Replacement", species: "human", location: "WESTERN YARD", palette: [0x68402f, 0x080808, 0x27343a], weapon: "COMPACT SMG", detail: 15 },
  { codename: "The Host", species: "human", location: "HILLSIDE ESTATE", palette: [0xd8ab86, 0x6a513a, 0x301f26], weapon: "HAND CANNON", detail: 16 },
  { codename: "The Guest", species: "human", location: "HILLSIDE ESTATE", palette: [0x9a6048, 0x15100d, 0x182b31], weapon: "HAND CANNON", detail: 17 },
  { codename: "The Butler", species: "human", location: "HILLSIDE ESTATE", palette: [0xb77b5c, 0x7b746a, 0x15181d], weapon: "HAND CANNON", detail: 18 },
  { codename: "The Double", species: "human", location: "HILLSIDE ESTATE", palette: [0xb98a68, 0x171615, 0x7d1d19], weapon: "HAND CANNON", detail: 19 },
  { codename: "Unit 21", species: "robot", location: "BLACK SITE", palette: [0x777b7e, 0x0a0a0a, 0x6f1111], weapon: "BREACH RIFLE", detail: 20 },
  { codename: "Unit 22", species: "robot", location: "BLACK SITE", palette: [0x4f555a, 0x101214, 0x89201c], weapon: "BREACH RIFLE", detail: 21 },
  { codename: "The Brother", species: "human", location: "BLACK SITE", palette: [0xb98a68, 0x171615, 0x252b30], weapon: "BREACH RIFLE", detail: 22 },
  { codename: "A.J.", species: "human", location: "CLASSIFIED", palette: [0xb98a68, 0x171615, 0x7d1d19], weapon: "BREACH RIFLE", detail: 23 },
];

const INTRO = [
  "YOUR NAME IS A.J.",
  "YOUR PAST IS CLASSIFIED.",
  "YOUR BROTHER IS MISSING.",
  "THERE IS ONLY ONE LEAD — AND IT IS VERY CLOSE.",
];

const PRAISE = [
  "EXCELLENT", "DEVASTATING", "POINT-BLANK", "UNFLINCHING", "IMPORTANT", "MASTERFUL",
];

type Shard = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
};

type Runtime = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  target: THREE.Group | null;
  hitTarget: THREE.Mesh | null;
  environment: THREE.Group | null;
  gun: THREE.Group;
  muzzle: THREE.PointLight;
  muzzleMesh: THREE.Mesh;
  shards: Shard[];
  recoil: number;
  shotFlash: number;
  frame: number;
  reducedMotion: boolean;
};

type Aim = { x: number; y: number };
type Shot = { tick: number; hit: boolean };
type HitTest = () => boolean;

function material(color: number, roughness = 0.72, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function physicalMaterial(color: number, roughness = 0.62, metalness = 0, clearcoat = 0.08) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness, clearcoat, clearcoatRoughness: 0.78 });
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
  root.traverse((child) => {
    const item = child as THREE.Mesh;
    item.geometry?.dispose?.();
    const itemMaterial = item.material as THREE.Material | THREE.Material[] | undefined;
    const disposeMaterial = (entry: THREE.Material) => {
      const mapped = entry as THREE.Material & { map?: THREE.Texture };
      mapped.map?.dispose();
      entry.dispose();
    };
    if (Array.isArray(itemMaterial)) itemMaterial.forEach(disposeMaterial);
    else if (itemMaterial) disposeMaterial(itemMaterial);
  });
  root.removeFromParent();
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

function buildHuman(target: Target) {
  const group = new THREE.Group();
  const [skin, hair, clothes] = target.palette;
  const faceWidth = 0.31 + (target.detail % 3) * 0.008;
  const skinFinish = physicalMaterial(skin, 0.72, 0, 0.04);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 36), skinFinish);
  head.scale.set(faceWidth, 0.405, 0.286);
  head.position.set(0, 0.34, 0);
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  // The layered cheeks, jaw and features keep the close-up face from reading as a primitive sphere.
  addEllipsoid(group, [0.19, 0.18, 0.085], [-0.115, 0.27, 0.225], skin, 32);
  addEllipsoid(group, [0.19, 0.18, 0.085], [0.115, 0.27, 0.225], skin, 32);
  addEllipsoid(group, [0.225, 0.18, 0.14], [0, 0.085, 0.075], skin, 34);
  addEllipsoid(group, [0.13, 0.075, 0.07], [0, 0.19, 0.258], skin, 28);

  const earGeometry = new THREE.SphereGeometry(1, 24, 18);
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(earGeometry.clone(), skinFinish.clone());
    ear.position.set((faceWidth + 0.018) * side, 0.32, 0.005);
    ear.scale.set(0.045, 0.09, 0.033);
    ear.castShadow = true;
    group.add(ear);
    addEllipsoid(group, [0.013, 0.046, 0.015], [(faceWidth + 0.024) * side, 0.32, 0.034], 0x6b352b, 18);
  });

  const eyeSpacing = 0.118 + (target.detail % 2) * 0.006;
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), physicalMaterial(0xe5dfd2, 0.28, 0, 0.45));
    eye.position.set(eyeSpacing * side, 0.39, 0.281);
    eye.scale.set(0.067, 0.038, 0.028);
    group.add(eye);
    const irisColor = [0x35261c, 0x3a4c43, 0x273b4c][target.detail % 3];
    const iris = mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.006, 24), irisColor, 0.35, 0.05);
    iris.rotation.x = Math.PI / 2;
    iris.position.set(eyeSpacing * side, 0.39, 0.311);
    group.add(iris);
    const pupil = mesh(new THREE.SphereGeometry(0.008, 16, 10), 0x050505, 0.2, 0.1);
    pupil.position.set(eyeSpacing * side, 0.39, 0.317);
    group.add(pupil);
    const catchlight = mesh(new THREE.SphereGeometry(0.0045, 10, 8), 0xffffff, 0.1, 0);
    catchlight.position.set(eyeSpacing * side - 0.006, 0.398, 0.325);
    group.add(catchlight);
    const brow = mesh(new THREE.CapsuleGeometry(0.014, 0.105, 6, 12), hair, 0.88, 0);
    brow.rotation.z = Math.PI / 2 + side * (target.detail % 2 ? -0.09 : 0.06);
    brow.position.set(eyeSpacing * side, 0.485, 0.273);
    group.add(brow);
  });

  addEllipsoid(group, [0.037, 0.12, 0.042], [0, 0.32, 0.286], skin, 28);
  addEllipsoid(group, [0.065, 0.05, 0.052], [0, 0.25, 0.32], skin, 30);
  [-1, 1].forEach((side) => addEllipsoid(group, [0.014, 0.009, 0.008], [0.026 * side, 0.243, 0.363], 0x2b1713, 16));

  const lipColor = target.detail % 4 === 0 ? 0x6c332f : 0x4a2724;
  const upperLip = addEllipsoid(group, [0.093, 0.018, 0.022], [0, 0.125, 0.292], lipColor, 28);
  upperLip.rotation.z = (target.detail % 3 - 1) * 0.035;
  addEllipsoid(group, [0.083, 0.014, 0.018], [0, 0.105, 0.288], 0x7d443d, 26);
  addEllipsoid(group, [0.085, 0.007, 0.008], [0, 0.116, 0.313], 0x170b0a, 22);

  const hairCap = mesh(
    new THREE.SphereGeometry(1, 42, 22, 0, Math.PI * 2, 0, Math.PI * 0.5),
    hair,
  );
  hairCap.scale.set(faceWidth * 1.045, 0.425, 0.295);
  hairCap.position.y = 0.345;
  group.add(hairCap);
  const hairCount = 4 + (target.detail % 4);
  for (let i = 0; i < hairCount; i += 1) {
    const clump = mesh(new THREE.ConeGeometry(0.045, 0.18 + (i % 2) * 0.04, 10), hair, 0.86, 0);
    clump.position.set(-0.19 + i * (0.38 / Math.max(1, hairCount - 1)), 0.68 + Math.sin(i * 2.1) * 0.015, 0.04);
    clump.rotation.z = (i - hairCount / 2) * 0.08;
    group.add(clump);
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

  const neck = mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.32, 24), skin);
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

function buildRobot(target: Target) {
  const group = new THREE.Group();
  const [steel, dark, accent] = target.palette;
  const head = mesh(new THREE.BoxGeometry(0.56, 0.7, 0.5, 2, 2, 2), steel, 0.3, 0.72);
  head.position.y = 0.3;
  group.add(head);
  const visor = addBox(group, [0.38, 0.1, 0.035], [0, 0.42, 0.27], dark);
  const glow = addBox(group, [0.14, 0.045, 0.018], [target.detail % 2 ? 0.09 : -0.09, 0.42, 0.292], accent);
  visor.rotation.z = -0.02;
  glow.rotation.z = -0.02;
  const jaw = addBox(group, [0.38, 0.14, 0.07], [0, 0.08, 0.27], dark);
  jaw.rotation.x = 0.05;
  [-1, 1].forEach((side) => addBox(group, [0.1, 0.28, 0.1], [0.34 * side, 0.31, 0], dark));
  const neck = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8), dark, 0.25, 0.7);
  neck.position.y = -0.15;
  group.add(neck);
  const torso = mesh(new THREE.BoxGeometry(0.85, 0.8, 0.42), dark, 0.4, 0.55);
  torso.position.y = -0.68;
  group.add(torso);
  addBox(group, [0.16, 0.2, 0.05], [0, -0.58, 0.24], accent);
  return group;
}

function buildTarget(target: Target) {
  const group = target.species === "horse"
    ? buildHorse(target)
    : target.species === "ostrich"
      ? buildOstrich(target)
      : target.species === "robot"
        ? buildRobot(target)
        : buildHuman(target);
  const hitRadius = target.species === "ostrich" ? 0.31 : target.species === "horse" ? 0.42 : target.species === "robot" ? 0.42 : 0.39;
  const hitY = target.species === "ostrich" ? 0.46 : 0.34;
  const hitTarget = new THREE.Mesh(
    new THREE.SphereGeometry(hitRadius, 30, 22),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  );
  hitTarget.name = "head-hit-target";
  hitTarget.position.set(0, hitY, 0.03);
  group.add(hitTarget);
  group.position.set(0, -0.02, -1.46);
  group.rotation.y = target.detail % 2 ? -0.035 : 0.035;
  return group;
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

function buildEnvironment(target: Target, scene: THREE.Scene) {
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

function buildGun() {
  const gun = new THREE.Group();
  const black = material(0x08090a, 0.23, 0.78);
  const steel = material(0x3d4143, 0.2, 0.9);
  const wornSteel = material(0x777773, 0.32, 0.82);
  const slide = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.55, 8, 24), steel);
  slide.rotation.x = Math.PI / 2;
  slide.scale.x = 0.86;
  slide.position.set(0, 0.018, -0.37);
  slide.castShadow = true;
  gun.add(slide);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.82, 32), black);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.015, -0.72);
  gun.add(barrel);
  const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.057, 0.012, 10, 30), wornSteel);
  muzzleRing.position.set(0, 0.015, -1.125);
  gun.add(muzzleRing);
  const muzzleDark = new THREE.Mesh(new THREE.CircleGeometry(0.047, 30), material(0x010101, 0.95, 0));
  muzzleDark.position.set(0, 0.015, -1.139);
  muzzleDark.rotation.y = Math.PI;
  gun.add(muzzleDark);
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.3, 8, 22), black);
  grip.position.set(0, -0.245, -0.08);
  grip.rotation.x = -0.28;
  gun.add(grip);
  for (let i = 0; i < 5; i += 1) {
    const groove = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.005, 5, 18, Math.PI), wornSteel);
    groove.rotation.x = Math.PI / 2;
    groove.rotation.z = Math.PI / 2;
    groove.position.set(0, -0.16 - i * 0.047, -0.02 - i * 0.014);
    gun.add(groove);
  }
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.055, 0.1), black);
  sight.position.set(0, 0.118, -0.57);
  gun.add(sight);
  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.045), black);
  rearSight.position.set(0, 0.116, -0.12);
  gun.add(rearSight);
  const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.015, 10, 30, Math.PI * 1.45), black);
  triggerGuard.position.set(0, -0.105, -0.24);
  triggerGuard.rotation.z = -Math.PI * 0.72;
  gun.add(triggerGuard);
  const trigger = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.07, 5, 8), wornSteel);
  trigger.position.set(0, -0.12, -0.225);
  trigger.rotation.z = 0.3;
  gun.add(trigger);

  const glove = material(0x171513, 0.92, 0.01);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.19, 30, 22), glove);
  hand.scale.set(0.82, 1.2, 0.76);
  hand.position.set(0.02, -0.42, 0.02);
  gun.add(hand);
  for (let i = 0; i < 3; i += 1) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.13, 6, 12), glove);
    finger.rotation.x = Math.PI / 2;
    finger.position.set(-0.065 + i * 0.065, -0.3, -0.13 - i * 0.014);
    gun.add(finger);
  }
  gun.position.set(0.52, -0.42, -0.58);
  gun.rotation.set(-0.1, -0.13, -0.055);
  gun.scale.setScalar(1.14);
  return gun;
}

function createShards(runtime: Runtime, target: Target) {
  const origin = new THREE.Vector3(0, 0.31, -1.42);
  const colors = target.species === "robot"
    ? [0x242a2d, 0x737a7d, 0xb7241f]
    : [target.palette[0], 0x6e1513, 0xb9271f, target.palette[1]];
  const count = runtime.reducedMotion ? 16 : 34;
  for (let i = 0; i < count; i += 1) {
    const size = 0.025 + Math.random() * 0.07;
    const geometry = i % 3 === 0
      ? new THREE.TetrahedronGeometry(size * 0.82, 0)
      : new THREE.SphereGeometry(size * 0.58, 10, 7);
    const shardMesh = mesh(geometry, colors[i % colors.length], 0.55, target.species === "robot" ? 0.5 : 0);
    shardMesh.position.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.2));
    runtime.scene.add(shardMesh);
    runtime.shards.push({
      mesh: shardMesh,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 1.9, 0.2 + Math.random() * 1.5, 0.8 + Math.random() * 1.7),
      spin: new THREE.Vector3(Math.random() * 7, Math.random() * 7, Math.random() * 7),
      life: 1,
    });
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
  aimRef,
  hitTestRef,
}: {
  target: Target;
  shot: Shot;
  reducedMotion: boolean;
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
    const camera = new THREE.PerspectiveCamera(56, 1, 0.05, 80);
    camera.position.set(0, 0.08, 0);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const ambient = new THREE.HemisphereLight(0xb6c0ba, 0x120a09, 1.25);
    scene.add(ambient);
    const key = new THREE.SpotLight(0xe9ded0, 4.5, 7, Math.PI / 5, 0.7, 1.5);
    key.position.set(0.8, 2.2, 0.1);
    key.target.position.set(0, 0, -1.8);
    key.castShadow = true;
    scene.add(key, key.target);

    const gun = buildGun();
    camera.add(gun);
    scene.add(camera);
    const muzzle = new THREE.PointLight(0xff9f42, 0, 3, 2);
    muzzle.position.set(0, 0.02, -1);
    gun.add(muzzle);
    const muzzleMesh = mesh(new THREE.IcosahedronGeometry(0.09, 0), 0xffb34e, 0.1, 0);
    muzzleMesh.position.set(0, 0.02, -1.02);
    muzzleMesh.visible = false;
    gun.add(muzzleMesh);

    const runtime: Runtime = {
      scene, camera, renderer, target: null, hitTarget: null, environment: null, gun, muzzle, muzzleMesh,
      shards: [], recoil: 0, shotFlash: 0, frame: 0, reducedMotion,
    };
    runtimeRef.current = runtime;
    const raycaster = new THREE.Raycaster();
    const aimVector = new THREE.Vector2();
    hitTestRef.current = () => {
      if (!runtime.hitTarget || !runtime.target?.visible) return false;
      aimVector.set(aimRef.current.x, aimRef.current.y);
      raycaster.setFromCamera(aimVector, camera);
      return raycaster.intersectObject(runtime.hitTarget, false).length > 0;
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
      if (runtime.target?.visible) {
        runtime.target.position.y = -0.02 + Math.sin(t * 1.45 + targetRef.current.detail) * 0.012;
        runtime.target.rotation.y = (targetRef.current.detail % 2 ? -0.035 : 0.035) + Math.sin(t * 0.7 + targetRef.current.detail) * 0.018;
      }
      runtime.recoil *= Math.pow(0.002, delta);
      const tracking = Math.min(1, delta * 11);
      gun.position.x = THREE.MathUtils.lerp(gun.position.x, 0.52 + aim.x * 0.14, tracking);
      gun.position.y = THREE.MathUtils.lerp(gun.position.y, -0.42 + aim.y * 0.085, tracking);
      gun.position.z = -0.58 + runtime.recoil * 0.3;
      gun.rotation.x = THREE.MathUtils.lerp(gun.rotation.x, -0.1 + aim.y * 0.085 + runtime.recoil * 0.42, tracking);
      gun.rotation.y = THREE.MathUtils.lerp(gun.rotation.y, -0.13 - aim.x * 0.12, tracking);
      gun.rotation.z = THREE.MathUtils.lerp(gun.rotation.z, -0.055 - aim.x * 0.035, tracking);
      runtime.shotFlash = Math.max(0, runtime.shotFlash - delta * 8);
      muzzle.intensity = runtime.shotFlash * 22;
      muzzleMesh.visible = runtime.shotFlash > 0.25;
      muzzleMesh.rotation.z += delta * 18;

      runtime.shards.forEach((shard) => {
        shard.life -= delta * 0.9;
        shard.velocity.y -= delta * 2.9;
        shard.mesh.position.addScaledVector(shard.velocity, delta);
        shard.mesh.rotation.x += shard.spin.x * delta;
        shard.mesh.rotation.y += shard.spin.y * delta;
        shard.mesh.rotation.z += shard.spin.z * delta;
        shard.mesh.scale.setScalar(Math.max(0, shard.life));
      });
      runtime.shards = runtime.shards.filter((shard) => {
        if (shard.life > 0) return true;
        disposeObject(shard.mesh);
        return false;
      });
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, aim.x * 0.045 + (runtime.reducedMotion ? 0 : Math.sin(t * 0.5) * 0.004), tracking * 0.55);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.08 + aim.y * 0.025, tracking * 0.55);
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
      disposeObject(gun);
      renderer.dispose();
      runtimeRef.current = null;
      hitTestRef.current = null;
    };
  }, [aimRef, hitTestRef, reducedMotion]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    targetRef.current = target;
    runtime.reducedMotion = reducedMotion;
    runtime.shards.forEach((shard) => disposeObject(shard.mesh));
    runtime.shards = [];
    disposeObject(runtime.target);
    disposeObject(runtime.environment);
    runtime.environment = buildEnvironment(target, runtime.scene);
    runtime.scene.add(runtime.environment);
    runtime.target = buildTarget(target);
    runtime.hitTarget = runtime.target.getObjectByName("head-hit-target") as THREE.Mesh;
    runtime.scene.add(runtime.target);
  }, [target, reducedMotion]);

  useEffect(() => {
    if (shot.tick === 0) return;
    const runtime = runtimeRef.current;
    if (!runtime || !runtime.target) return;
    runtime.recoil = 1;
    runtime.shotFlash = 1;
    if (shot.hit) {
      runtime.target.visible = false;
      createShards(runtime, targetRef.current);
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

  const playShot = useCallback(() => {
    const context = ensureContext();
    if (!context) return;
    const now = context.currentTime;
    const length = Math.floor(context.sampleRate * 0.22);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.2);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.62, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    noise.connect(filter).connect(gain).connect(context.destination);
    noise.start(now);
    noise.stop(now + 0.23);

    const thump = context.createOscillator();
    const thumpGain = context.createGain();
    thump.type = "triangle";
    thump.frequency.setValueAtTime(92, now);
    thump.frequency.exponentialRampToValueAtTime(38, now + 0.16);
    thumpGain.gain.setValueAtTime(0.5, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    thump.connect(thumpGain).connect(context.destination);
    thump.start(now);
    thump.stop(now + 0.19);
  }, [ensureContext]);

  useEffect(() => () => {
    if (contextRef.current) void contextRef.current.close();
  }, []);

  return { ensureContext, playShot };
}

export default function CloseRangeGame() {
  const [phase, setPhase] = useState<Phase>("title");
  const [targetIndex, setTargetIndex] = useState(0);
  const [introLine, setIntroLine] = useState(0);
  const [shot, setShot] = useState<Shot>({ tick: 0, hit: false });
  const [feedback, setFeedback] = useState("");
  const [feedbackKind, setFeedbackKind] = useState<"hit" | "miss">("hit");
  const [feedbackTick, setFeedbackTick] = useState(0);
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(8);
  const [shotsFired, setShotsFired] = useState(0);
  const [muted, setMuted] = useState(false);
  const [reducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const lockedRef = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);
  const aimRef = useRef<Aim>({ x: 0, y: 0 });
  const hitTestRef = useRef<HitTest | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const { ensureContext, playShot } = useShotAudio(muted);
  const target = TARGETS[targetIndex];

  const begin = useCallback(() => {
    ensureContext();
    setTargetIndex(0);
    setScore(0);
    setAmmo(8);
    setShotsFired(0);
    setIntroLine(0);
    setFeedback("");
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
      else setPhase("playing");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [introLine, phase, reducedMotion]);

  const skipIntro = useCallback(() => setPhase("playing"), []);

  const fire = useCallback(() => {
    if (phase !== "playing" || lockedRef.current) return;
    playShot();
    const hit = hitTestRef.current?.() ?? true;
    setShot((value) => ({ tick: value.tick + 1, hit }));
    setShotsFired((value) => value + 1);
    setAmmo((value) => value <= 1 ? 8 : value - 1);
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    if (!hit) {
      setFeedbackKind("miss");
      setFeedback("CLOSER.");
      setFeedbackTick((value) => value + 1);
      feedbackTimerRef.current = window.setTimeout(() => setFeedback(""), reducedMotion ? 260 : 620);
      return;
    }
    lockedRef.current = true;
    setFeedbackKind("hit");
    setFeedback(PRAISE[targetIndex % PRAISE.length]);
    setFeedbackTick((value) => value + 1);
    setScore((value) => value + 1000 + targetIndex * 125);
    setPhase("transition");
    window.setTimeout(() => {
      if (targetIndex >= TARGETS.length - 1) {
        setPhase("complete");
      } else {
        setTargetIndex((value) => value + 1);
        setFeedback("");
        lockedRef.current = false;
        setPhase("playing");
      }
    }, reducedMotion ? 520 : 1050);
  }, [phase, playShot, reducedMotion, targetIndex]);

  useEffect(() => () => {
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.code === "Space" || event.code === "Enter") && phase === "playing") {
        event.preventDefault();
        fire();
      }
      if (event.code === "Space" && phase === "title") {
        event.preventDefault();
        begin();
      }
      if (event.code === "Escape" && phase === "intro") skipIntro();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [begin, fire, phase, skipIntro]);

  const rank = useMemo(() => {
    if (score >= 56000) return "CULTURAL LANDMARK";
    if (score >= 48000) return "UNFLINCHING";
    return "POINT-BLANK";
  }, [score]);

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
  }, []);

  const handleStagePointer = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    updateAim(event);
    fire();
  };

  return (
    <main className={`game-shell phase-${phase}`}>
      <div
        className="game-frame"
        ref={frameRef}
        onPointerMove={updateAim}
        onPointerDown={handleStagePointer}
      >
        <ThreeStage target={target} shot={shot} reducedMotion={reducedMotion} aimRef={aimRef} hitTestRef={hitTestRef} />
        <div className="vignette" />
        <div className="film-grain" />

        <button className="sound-toggle" type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted}>
          SOUND {muted ? "OFF" : "ON"}
        </button>

        {(phase === "playing" || phase === "transition") && (
          <section className="hud" aria-label="Game status">
            <div ref={crosshairRef} className="crosshair" aria-hidden="true"><i /><b /></div>
            <div
              key={`${feedbackTick}-${feedback}`}
              className={`praise praise-${feedbackKind} ${feedback ? "is-visible" : ""}`}
              role="status"
              aria-live="polite"
            >{feedback}</div>
            <div className="score-counter" aria-label={`Score ${score}`}>{score}</div>
            <div className="location-slate" key={targetIndex}>
              <span>{String(targetIndex + 1).padStart(2, "0")} / 24</span>
              <strong>{target.codename}</strong>
              <small>{target.location}</small>
            </div>
            <div className="weapon-mark" aria-label={target.weapon}>
              <i /><b /><span>{target.weapon}</span>
            </div>
            <div className="fire-prompt">MOVE TO AIM&nbsp;&nbsp;•&nbsp;&nbsp; CLICK OR SPACE TO FIRE</div>
            <div className="ammo-readout" aria-label={`${ammo} of 8 rounds`}>
              <div className="shell-stack">{Array.from({ length: 8 }, (_, index) => <i key={index} className={index < ammo ? "loaded" : ""} />)}</div>
              <strong>{ammo}</strong><span>/8</span>
            </div>
          </section>
        )}

        {phase === "title" && (
          <section className="title-screen">
            <p className="eyebrow">AN UNOFFICIAL 3D TRIBUTE TO THE 2009 FAKE GAME</p>
            <h1><span>CLOSE</span><span>RANGE</span></h1>
            <div className="review-stamp review-one"><strong>“INCREDIBLE”</strong><small>OGN.COM</small></div>
            <div className="review-stamp review-two"><strong>“BREATHTAKING”</strong><small>GAME INSIDER</small></div>
            <p className="tagline">START THE EPIC JOURNEY NOW!</p>
            <button className="primary-button" type="button" onClick={begin}><span>PLAY ONLINE NOW</span><kbd>SPACE</kbd></button>
            <div className="title-meta"><span>24 SEQUENCES</span><span>FREE AIM</span><span>POINT-BLANK 3D</span></div>
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

        {phase === "complete" && (
          <section className="complete-screen">
            <p className="eyebrow">CAMPAIGN COMPLETE</p>
            <h2>CONGRATULATIONS.</h2>
            <p className="complete-copy">You have experienced the full emotional and mechanical range of modern combat.</p>
            <div className="result-grid">
              <div><small>FACES</small><strong>24 / 24</strong></div>
              <div><small>SHOTS</small><strong>{shotsFired}</strong></div>
              <div><small>RATING</small><strong>{rank}</strong></div>
            </div>
            <button className="primary-button" type="button" onClick={begin}><span>PLAY AGAIN</span><kbd>SPACE</kbd></button>
          </section>
        )}

        <div className={`impact-flash ${phase === "transition" ? "active" : ""}`} />
      </div>
    </main>
  );
}
