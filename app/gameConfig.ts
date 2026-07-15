export type Phase = "title" | "intro" | "chapter" | "playing" | "reloading" | "transition" | "complete";
export type Species = "human" | "horse" | "ostrich";
export type GameMode = "solo" | "couch";
export type WeaponKind = "revolver" | "smg" | "shotgun";
export type EnvironmentKind = "alley" | "warehouse" | "cubicle" | "finale";
export type EntryKind = "left" | "below" | "static";
export type QualityMode = "auto" | "low" | "high";
export type QualityTier = "low" | "medium" | "high";

export type WeaponProfile = {
  kind: WeaponKind;
  label: string;
  capacity: number;
  ammoCost: number;
  visualBursts: number;
  goreMultiplier: number;
  recoil: number;
};

export type ChapterDefinition = {
  sequence: number;
  eyebrow: string;
  headline: string;
  copy: string;
};

export type SequenceDefinition = {
  codename: string;
  species: Species;
  location: string;
  palette: [number, number, number];
  weaponKind: WeaponKind;
  environmentKind: EnvironmentKind;
  entryKind: EntryKind;
  detail: number;
};

export type QualityProfile = {
  tier: QualityTier;
  pixelRatio: number;
  shadows: boolean;
  shadowMapSize: number;
  mistParticles: number;
  chunks: number;
  foregroundSheets: number;
  textureSize: 512 | 1024;
};

export const WEAPON_PROFILES: Record<WeaponKind, WeaponProfile> = {
  revolver: {
    kind: "revolver",
    label: ".357 SILVER REVOLVER",
    capacity: 6,
    ammoCost: 1,
    visualBursts: 1,
    goreMultiplier: 1,
    recoil: 1,
  },
  smg: {
    kind: "smg",
    label: "COMPACT SMG // 3-RND BURST",
    capacity: 18,
    ammoCost: 3,
    visualBursts: 3,
    goreMultiplier: 1.22,
    recoil: 0.72,
  },
  shotgun: {
    kind: "shotgun",
    label: "12-GAUGE PUMP SHOTGUN",
    capacity: 5,
    ammoCost: 1,
    visualBursts: 1,
    goreMultiplier: 1.58,
    recoil: 1.42,
  },
};

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  low: {
    tier: "low",
    pixelRatio: 1,
    shadows: false,
    shadowMapSize: 0,
    mistParticles: 100,
    chunks: 12,
    foregroundSheets: 1,
    textureSize: 512,
  },
  medium: {
    tier: "medium",
    pixelRatio: 1.35,
    shadows: true,
    shadowMapSize: 512,
    mistParticles: 180,
    chunks: 24,
    foregroundSheets: 2,
    textureSize: 1024,
  },
  high: {
    tier: "high",
    pixelRatio: 1.75,
    shadows: true,
    shadowMapSize: 1024,
    mistParticles: 280,
    chunks: 48,
    foregroundSheets: 4,
    textureSize: 1024,
  },
};

export const CHAPTERS: ChapterDefinition[] = [
  {
    sequence: 0,
    eyebrow: "TECH TRENDS PRESENTS // CHAPTER 01",
    headline: "THE FUTURE IS EIGHT INCHES AWAY",
    copy: "Rain. Brick. Four extremely available faces. Finally, distance has been solved.",
  },
  {
    sequence: 4,
    eyebrow: "CHAPTER 02 // AUTOMATIC INNOVATION",
    headline: "THREE BULLETS. ONE DECISION.",
    copy: "Experience the unprecedented narrative efficiency of a compact burst.",
  },
  {
    sequence: 9,
    eyebrow: "CHAPTER 03 // A CLASSIC RETURNS",
    headline: "THE REVOLVER HAS CHARACTER DEVELOPMENT",
    copy: "Six rounds. Six opportunities to learn absolutely nothing about the witness.",
  },
  {
    sequence: 13,
    eyebrow: "CHAPTER 04 // OFFICE CULTURE",
    headline: "DISRUPT THE OPEN-PLAN FACE",
    copy: "The shotgun brings unprecedented collaboration to a fluorescent workplace.",
  },
  {
    sequence: 18,
    eyebrow: "CHAPTER 05 // HIDDEN EXTRAS",
    headline: "THE ANIMAL KINGDOM IS OPEN",
    copy: "A horse. An ostrich. Both fully integrated into the kidnapped-brother narrative.",
  },
  {
    sequence: 20,
    eyebrow: "CLASSIFIED EPILOGUE // CHAPTER 06",
    headline: "FOUR FACES FROM THE TRUTH",
    copy: "Informants. Your brother. A.J. The mystery concludes at responsible conversational range.",
  },
];

export const SEQUENCES: SequenceDefinition[] = [
  { codename: "The Lookout", species: "human", location: "RAINY BRICK ALLEY", palette: [0xb98a68, 0x171615, 0x7d1d19], weaponKind: "revolver", environmentKind: "alley", entryKind: "left", detail: 0 },
  { codename: "The Driver", species: "human", location: "RAINY BRICK ALLEY", palette: [0x825a43, 0x090909, 0x384252], weaponKind: "revolver", environmentKind: "alley", entryKind: "left", detail: 1 },
  { codename: "The Accountant", species: "human", location: "RAINY BRICK ALLEY", palette: [0xd0a17e, 0x3a261e, 0x273142], weaponKind: "revolver", environmentKind: "alley", entryKind: "left", detail: 2 },
  { codename: "The Witness", species: "human", location: "RAINY BRICK ALLEY", palette: [0x9d684e, 0x16110e, 0x5c1617], weaponKind: "revolver", environmentKind: "alley", entryKind: "left", detail: 3 },
  { codename: "The Negotiator", species: "human", location: "FLUORESCENT WAREHOUSE", palette: [0xe0b28c, 0x402319, 0x20242c], weaponKind: "smg", environmentKind: "warehouse", entryKind: "left", detail: 4 },
  { codename: "The Assistant", species: "human", location: "FLUORESCENT WAREHOUSE", palette: [0x704733, 0x111111, 0x6c3229], weaponKind: "smg", environmentKind: "warehouse", entryKind: "left", detail: 5 },
  { codename: "The Consultant", species: "human", location: "FLUORESCENT WAREHOUSE", palette: [0xb77b5c, 0x261611, 0x263543], weaponKind: "smg", environmentKind: "warehouse", entryKind: "left", detail: 6 },
  { codename: "The Director", species: "human", location: "FLUORESCENT WAREHOUSE", palette: [0xc99370, 0x6b6258, 0x202020], weaponKind: "smg", environmentKind: "warehouse", entryKind: "left", detail: 7 },
  { codename: "The Courier", species: "human", location: "FLUORESCENT WAREHOUSE", palette: [0x7f513b, 0x12100e, 0x31383c], weaponKind: "smg", environmentKind: "warehouse", entryKind: "left", detail: 8 },
  { codename: "The Tourist", species: "human", location: "WAREHOUSE ANNEX", palette: [0xd2a07d, 0xb09855, 0x482126], weaponKind: "revolver", environmentKind: "warehouse", entryKind: "left", detail: 9 },
  { codename: "The Inspector", species: "human", location: "WAREHOUSE ANNEX", palette: [0xa87355, 0x30231d, 0x1c2630], weaponKind: "revolver", environmentKind: "warehouse", entryKind: "left", detail: 10 },
  { codename: "The Mechanic", species: "human", location: "WAREHOUSE ANNEX", palette: [0x8d5d44, 0x221711, 0x485159], weaponKind: "revolver", environmentKind: "warehouse", entryKind: "left", detail: 11 },
  { codename: "The Foreman", species: "human", location: "WAREHOUSE ANNEX", palette: [0xcc9975, 0x4d2f20, 0x3c332b], weaponKind: "revolver", environmentKind: "warehouse", entryKind: "left", detail: 12 },
  { codename: "The Host", species: "human", location: "CUBICLE CORRIDOR", palette: [0xd8ab86, 0x6a513a, 0x301f26], weaponKind: "shotgun", environmentKind: "cubicle", entryKind: "left", detail: 13 },
  { codename: "The Guest", species: "human", location: "CUBICLE CORRIDOR", palette: [0x9a6048, 0x15100d, 0x182b31], weaponKind: "shotgun", environmentKind: "cubicle", entryKind: "left", detail: 14 },
  { codename: "The Butler", species: "human", location: "CUBICLE CORRIDOR", palette: [0xb77b5c, 0x7b746a, 0x15181d], weaponKind: "shotgun", environmentKind: "cubicle", entryKind: "left", detail: 15 },
  { codename: "The Replacement", species: "human", location: "CUBICLE CORRIDOR", palette: [0x68402f, 0x080808, 0x27343a], weaponKind: "shotgun", environmentKind: "cubicle", entryKind: "left", detail: 16 },
  { codename: "The Regional Face", species: "human", location: "CUBICLE CORRIDOR", palette: [0xb98a68, 0x171615, 0x7d1d19], weaponKind: "shotgun", environmentKind: "cubicle", entryKind: "left", detail: 17 },
  { codename: "The Horse", species: "horse", location: "CUBICLE CORRIDOR", palette: [0x7c4e32, 0x21150f, 0x4b1515], weaponKind: "shotgun", environmentKind: "cubicle", entryKind: "left", detail: 18 },
  { codename: "The Ostrich", species: "ostrich", location: "CUBICLE CORRIDOR", palette: [0xc7a17f, 0x2d2925, 0x551514], weaponKind: "shotgun", environmentKind: "cubicle", entryKind: "below", detail: 19 },
  { codename: "The Informant", species: "human", location: "CLASSIFIED FINALE", palette: [0x6f4634, 0x10100f, 0x383126], weaponKind: "revolver", environmentKind: "finale", entryKind: "static", detail: 20 },
  { codename: "The Other Informant", species: "human", location: "CLASSIFIED FINALE", palette: [0xc18a69, 0x51473d, 0x262a2e], weaponKind: "smg", environmentKind: "finale", entryKind: "static", detail: 21 },
  { codename: "The Brother", species: "human", location: "CLASSIFIED FINALE", palette: [0xb98a68, 0x171615, 0x252b30], weaponKind: "shotgun", environmentKind: "finale", entryKind: "static", detail: 22 },
  { codename: "A.J.", species: "human", location: "CLASSIFIED FINALE", palette: [0xb98a68, 0x171615, 0x7d1d19], weaponKind: "revolver", environmentKind: "finale", entryKind: "static", detail: 23 },
];

export function chapterForSequence(sequence: number) {
  return CHAPTERS.find((chapter) => chapter.sequence === sequence) ?? null;
}

export function resolveQualityTier(
  mode: QualityMode,
  capabilities: { coarsePointer: boolean; viewportWidth: number; deviceMemory?: number; hardwareConcurrency?: number },
): QualityTier {
  if (mode === "low") return "low";
  if (mode === "high") return "high";
  const memory = capabilities.deviceMemory ?? 4;
  const cores = capabilities.hardwareConcurrency ?? 4;
  if (capabilities.coarsePointer || capabilities.viewportWidth < 720 || memory <= 3 || cores <= 4) return "low";
  if (capabilities.viewportWidth >= 1180 && memory >= 8 && cores >= 8) return "high";
  return "medium";
}
