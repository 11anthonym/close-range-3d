"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function material(color: number, roughness = 0.72, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
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
    if (Array.isArray(itemMaterial)) itemMaterial.forEach((entry) => entry.dispose());
    else itemMaterial?.dispose?.();
  });
  root.removeFromParent();
}

function buildHuman(target: Target) {
  const group = new THREE.Group();
  const [skin, hair, clothes] = target.palette;
  const head = mesh(new THREE.SphereGeometry(0.34, 28, 22), skin);
  head.scale.set(0.9 + (target.detail % 3) * 0.025, 1.12, 0.86);
  head.position.y = 0.32;
  group.add(head);

  const earGeometry = new THREE.SphereGeometry(0.075, 12, 8);
  [-1, 1].forEach((side) => {
    const ear = mesh(earGeometry.clone(), skin);
    ear.position.set(0.32 * side, 0.32, 0.015);
    ear.scale.set(0.55, 1, 0.55);
    group.add(ear);
  });

  const eyeWhite = new THREE.SphereGeometry(0.055, 12, 8);
  [-1, 1].forEach((side) => {
    const eye = mesh(eyeWhite.clone(), 0xd9d4c8);
    eye.position.set(0.125 * side, 0.39, 0.292);
    eye.scale.set(1, 0.62, 0.35);
    group.add(eye);
    const pupil = mesh(new THREE.SphereGeometry(0.019, 8, 6), 0x080808);
    pupil.position.set(0.125 * side, 0.39, 0.322);
    group.add(pupil);
    const brow = addBox(group, [0.13, 0.022, 0.025], [0.125 * side, 0.48, 0.3], hair);
    brow.rotation.z = side * (target.detail % 2 ? -0.08 : 0.05);
  });

  const nose = mesh(new THREE.ConeGeometry(0.052, 0.18, 10), skin);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.3, 0.34);
  group.add(nose);
  const mouth = addBox(group, [0.16, 0.026, 0.022], [0, 0.16, 0.3], target.detail % 4 === 0 ? 0x54251f : 0x21100e);
  mouth.rotation.z = (target.detail % 3 - 1) * 0.06;

  const hairCap = mesh(
    new THREE.SphereGeometry(0.355, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45),
    hair,
  );
  hairCap.scale.set(0.93, 1.12, 0.88);
  hairCap.position.y = 0.34;
  group.add(hairCap);

  if (target.detail % 5 === 4) {
    const glasses = material(0x080808, 0.25, 0.25);
    [-1, 1].forEach((side) => {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.012, 8, 20), glasses);
      lens.position.set(0.12 * side, 0.39, 0.335);
      group.add(lens);
    });
    addBox(group, [0.08, 0.014, 0.014], [0, 0.39, 0.335], 0x080808);
  }

  const neck = mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.28, 16), skin);
  neck.position.y = -0.08;
  group.add(neck);
  const torso = mesh(new THREE.CylinderGeometry(0.34, 0.48, 0.82, 8), clothes);
  torso.position.y = -0.58;
  group.add(torso);
  return group;
}

function buildHorse(target: Target) {
  const group = new THREE.Group();
  const [coat, mane, blanket] = target.palette;
  const head = mesh(new THREE.SphereGeometry(0.35, 26, 20), coat);
  head.scale.set(0.72, 1.25, 1.08);
  head.position.set(0, 0.3, 0.02);
  group.add(head);
  const muzzle = mesh(new THREE.SphereGeometry(0.25, 20, 14), 0x9d7154);
  muzzle.scale.set(0.78, 0.7, 1.2);
  muzzle.position.set(0, 0.15, 0.31);
  group.add(muzzle);
  [-1, 1].forEach((side) => {
    const ear = mesh(new THREE.ConeGeometry(0.085, 0.36, 10), coat);
    ear.position.set(0.16 * side, 0.72, -0.02);
    ear.rotation.z = side * -0.18;
    group.add(ear);
    const eye = mesh(new THREE.SphereGeometry(0.035, 10, 8), 0x050505);
    eye.position.set(0.16 * side, 0.39, 0.335);
    group.add(eye);
  });
  const maneStrip = addBox(group, [0.08, 0.62, 0.12], [0, 0.44, -0.29], mane);
  maneStrip.rotation.x = -0.1;
  const neck = mesh(new THREE.CylinderGeometry(0.27, 0.4, 0.95, 14), coat);
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
  const neck = mesh(new THREE.CylinderGeometry(0.08, 0.13, 1.2, 12), skin);
  neck.position.y = -0.2;
  group.add(neck);
  const head = mesh(new THREE.SphereGeometry(0.24, 22, 18), skin);
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
  const body = mesh(new THREE.SphereGeometry(0.45, 22, 16), feathers);
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
  group.position.set(0, 0, -1.8);
  group.rotation.y = target.detail % 2 ? -0.035 : 0.035;
  return group;
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

  const floor = mesh(new THREE.PlaneGeometry(20, 20, 8, 8), worldColors[1]);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.28;
  group.add(floor);

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
  return group;
}

function buildGun() {
  const gun = new THREE.Group();
  const black = material(0x0a0a0a, 0.26, 0.72);
  const steel = material(0x303438, 0.24, 0.85);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.16, 0.72), steel);
  body.position.z = -0.24;
  gun.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.75, 14), black);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.015, -0.62);
  gun.add(barrel);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.42, 0.22), black);
  grip.position.set(0, -0.23, 0.02);
  grip.rotation.x = -0.22;
  gun.add(grip);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.12), black);
  sight.position.set(0, 0.115, -0.34);
  gun.add(sight);
  gun.position.set(0.5, -0.48, -0.68);
  gun.rotation.set(-0.08, -0.12, -0.05);
  return gun;
}

function createShards(runtime: Runtime, target: Target) {
  const origin = new THREE.Vector3(0, 0.3, -1.78);
  const colors = target.species === "robot"
    ? [0x242a2d, 0x737a7d, 0xb7241f]
    : [target.palette[0], 0x6e1513, 0xb9271f, target.palette[1]];
  const count = runtime.reducedMotion ? 16 : 34;
  for (let i = 0; i < count; i += 1) {
    const size = 0.025 + Math.random() * 0.07;
    const shardMesh = mesh(new THREE.BoxGeometry(size, size, size), colors[i % colors.length], 0.55, target.species === "robot" ? 0.5 : 0);
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

function ThreeStage({ target, shotTick, reducedMotion }: { target: Target; shotTick: number; reducedMotion: boolean }) {
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
      scene, camera, renderer, target: null, environment: null, gun, muzzle, muzzleMesh,
      shards: [], recoil: 0, shotFlash: 0, frame: 0, reducedMotion,
    };
    runtimeRef.current = runtime;

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
      if (runtime.target?.visible) {
        runtime.target.position.y = Math.sin(t * 1.45 + targetRef.current.detail) * 0.015;
        runtime.target.rotation.y = Math.sin(t * 0.7 + targetRef.current.detail) * 0.025;
      }
      runtime.recoil *= Math.pow(0.002, delta);
      gun.position.z = -0.68 + runtime.recoil * 0.25;
      gun.rotation.x = -0.08 + runtime.recoil * 0.38;
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
      camera.position.x = runtime.reducedMotion ? 0 : Math.sin(t * 0.5) * 0.005;
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
    };
  }, []);

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
    runtime.scene.add(runtime.target);
  }, [target, reducedMotion]);

  useEffect(() => {
    if (shotTick === 0) return;
    const runtime = runtimeRef.current;
    if (!runtime || !runtime.target) return;
    runtime.target.visible = false;
    runtime.recoil = 1;
    runtime.shotFlash = 1;
    createShards(runtime, targetRef.current);
  }, [shotTick]);

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
  const [shotTick, setShotTick] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const lockedRef = useRef(false);
  const { ensureContext, playShot } = useShotAudio(muted);
  const target = TARGETS[targetIndex];

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const begin = useCallback(() => {
    ensureContext();
    setTargetIndex(0);
    setScore(0);
    setIntroLine(0);
    setFeedback("");
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
    lockedRef.current = true;
    playShot();
    setFeedback(PRAISE[targetIndex % PRAISE.length]);
    setScore((value) => value + 1000 + targetIndex * 125);
    setShotTick((value) => value + 1);
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

  const handleStagePointer = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    fire();
  };

  return (
    <main className={`game-shell phase-${phase}`} onPointerDown={handleStagePointer}>
      <ThreeStage target={target} shotTick={shotTick} reducedMotion={reducedMotion} />
      <div className="vignette" />
      <div className="scanlines" />

      <header className="topbar">
        <div className="mini-logo" aria-label="Close Range">
          <span>CLOSE</span><span>RANGE</span>
        </div>
        <div className="mission-tag">CAMPAIGN // {target.location}</div>
        <button className="sound-toggle" type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted}>
          SOUND {muted ? "OFF" : "ON"}
        </button>
      </header>

      {(phase === "playing" || phase === "transition") && (
        <section className="hud" aria-label="Game status">
          <div className="target-bracket bracket-left" />
          <div className="target-bracket bracket-right" />
          <div className="crosshair"><i /><b /></div>
          <div className="target-id">
            <span>TARGET {String(targetIndex + 1).padStart(2, "0")}</span>
            <strong>{target.codename}</strong>
          </div>
          <div className={`praise ${feedback ? "is-visible" : ""}`} role="status" aria-live="polite">{feedback}</div>
          <div className="hud-bottom">
            <div><small>FACE</small><strong>{String(targetIndex + 1).padStart(2, "0")}<em>/24</em></strong></div>
            <div className="fire-prompt"><span>SPACE</span> OR CLICK TO FIRE</div>
            <div className="weapon"><small>WEAPON</small><strong>{target.weapon}</strong></div>
          </div>
        </section>
      )}

      {phase === "title" && (
        <section className="title-screen">
          <p className="eyebrow">AN UNOFFICIAL 3D RESTORATION</p>
          <h1><span>CLOSE</span><span>RANGE</span></h1>
          <p className="tagline">NO COVER. NO RELOADS. NO DISTANCE.</p>
          <button className="primary-button" type="button" onClick={begin}><span>BEGIN CAMPAIGN</span><kbd>SPACE</kbd></button>
          <div className="title-meta"><span>24 FACES</span><span>ONE BUTTON</span><span>ZERO RESTRAINT</span></div>
          <p className="attribution">Fan-made browser tribute. Original 2009 concept by The Onion.</p>
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
            <div><small>SCORE</small><strong>{score.toLocaleString()}</strong></div>
            <div><small>RATING</small><strong>{rank}</strong></div>
          </div>
          <button className="primary-button" type="button" onClick={begin}><span>PLAY AGAIN</span><kbd>SPACE</kbd></button>
        </section>
      )}

      <div className={`impact-flash ${phase === "transition" ? "active" : ""}`} />
    </main>
  );
}
