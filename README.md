# Close Range 3D

A playable, fan-made browser restoration of The Onion's 2009 *Close Range*
parody game. This version follows the surviving demo's location and weapon
progression while preserving free aiming, anatomical targeting, and the joke
that every conversation happens at catastrophically close range.

Once GitHub Pages is enabled, the browser build is available at:
[11anthonym.github.io/close-range-3d](https://11anthonym.github.io/close-range-3d/)

## Play

- Move the pointer to aim. Click, tap, or press `Space` to fire.
- Shots outside the target's head miss; move in close and line up the reticle.
- The face, ears, eyes, nose, mouth, and animal features are separate scoring
  targets with localized damage variants.
- The revolver holds 6 rounds, the SMG spends 3 of its 18 rounds per visual
  burst, and the shotgun holds 5 shells. Empty weapons reload automatically.
- Chapter cards appear before encounters 1, 5, 10, 14, 19, and 21. Press
  `Space`, `Enter`, or `Escape` to skip one.
- Complete all 24 point-blank encounters.
- Sound is synthesized in the browser; no commercial recording or voice track is used.

On phones, drag the reticle and tap to fire. The `VISUAL` control cycles through
`AUTO`, `LOW`, and `HIGH`; Auto considers pointer type, screen width, available
memory, and CPU cores. Low reduces shadows, pixels, rain, debris, and foreground
splatter while keeping the same aiming and scoring.

## Campaign structure

| Encounters | Location | Weapon |
| --- | --- | --- |
| 1-4 | Rainy brick alley | Silver revolver |
| 5-9 | Fluorescent warehouse | Compact SMG |
| 10-13 | Warehouse annex | Silver revolver |
| 14-20 | Cubicle corridor and animal extras | Pump shotgun |
| 21-24 | Classified epilogue | Revolver, SMG, shotgun, revolver |

## Run locally

Requires Node.js 22.13 or newer.

```bash
pnpm install
pnpm dev
```

Build and verify:

```bash
pnpm test
pnpm build:pages
```

## Project note

This is an unofficial tribute and preservation study. The original concept was
created by The Onion. All characters, effects, interface work, story copy, and
audio in this repository are newly created for this browser edition. Four
fictional head proportions reuse an audited CC0 MakeHuman core-mesh proof with
new vertex skin finishes, damage variants, and anatomical colliders; a continuous
procedural head remains the loading fallback. No actor likeness is reproduced.

The optional brick and concrete PBR materials are CC0 Poly Haven assets and have
512 px and 1K variants. See [the asset ledger](docs/ASSET_LICENSES.md) for source
and retrieval details. A procedural material remains available if an asset fails
to load.
