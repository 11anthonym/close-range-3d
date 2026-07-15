# Asset license ledger

All third-party visual assets in this project are optional enhancements. The game
retains a generated procedural fallback when an asset cannot be loaded.

| Asset | Files | Source | License | Retrieved |
| --- | --- | --- | --- | --- |
| Brick Wall 001 | `public/assets/materials/brick-*` | [Poly Haven](https://polyhaven.com/a/brick_wall_001) | CC0 | 2026-07-15 |
| Concrete Floor 02 | `public/assets/materials/concrete-*` | [Poly Haven](https://polyhaven.com/a/concrete_floor_02) | CC0 | 2026-07-15 |
| MakeHuman core base mesh head subset | `public/assets/faces/makehuman-head.glb` | [MakeHuman Community](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj) | CC0 as an exported MakeHuman model | 2026-07-15 |

The 512 px variants are downscaled from the listed 1K originals. No attribution
is required by CC0, but sources are retained here for provenance and auditing.
The MakeHuman proof head contains only faces whose vertices are above the neck
cut of the official core base mesh. It is stored as a Meshopt-compressed GLB;
four in-game head bases apply distinct proportions and newly generated skin
finishes to that topology. The game falls back to its continuous procedural head
if GLB loading or Meshopt decoding fails.
