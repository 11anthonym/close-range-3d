# Asset license ledger

All third-party visual assets in this project are optional enhancements. The game
retains a generated procedural fallback when an asset cannot be loaded.

| Asset | Files | Source | License | Retrieved |
| --- | --- | --- | --- | --- |
| Brick Wall 001 | `public/assets/materials/brick-*` | [Poly Haven](https://polyhaven.com/a/brick_wall_001) | CC0 | 2026-07-15 |
| Concrete Floor 02 | `public/assets/materials/concrete-*` | [Poly Haven](https://polyhaven.com/a/concrete_floor_02) | CC0 | 2026-07-15 |
| MakeHuman visible outer-head shell | `public/assets/faces/makehuman-head.glb` | [MakeHuman Community](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj) | CC0 as an exported MakeHuman model | 2026-07-15 |
| Original fictional casting atlas | `public/assets/faces/fictional-casting-atlas.png` | Generated specifically for this project with OpenAI image generation | Original project artwork | 2026-07-15 |

The 512 px variants are downscaled from the listed 1K originals. No attribution
is required by CC0, but sources are retained here for provenance and auditing.
The MakeHuman shell is reproducibly extracted from only the official `body`
group above the documented neck cut. It preserves the original UV seams while
excluding helper eyes, teeth, joints, and every torso/shoulder face. The aligned
2x2 casting atlas contains four newly generated fictional adults with no actor
likenesses. At runtime each portrait is softly matted, curved over the clean 3D
shell, and paired with the same anatomical hit and damage landmarks. The game
falls back to its continuous procedural head if either runtime asset cannot be
loaded or parsed.
