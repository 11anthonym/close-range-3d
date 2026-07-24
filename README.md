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

The main menu also includes two multiplayer formats:

- **Split-screen versus** renders two independent Three.js views. Player 1 uses
  the left view and Player 2 uses the right; on a phone the views stack
  vertically. Each player gets 12 separate encounters, ammunition, localized
  damage, and a personal score. A successful hit hands the turn to the other
  player.
- **Challenge link** is asynchronous web multiplayer for the static GitHub
  Pages build. Finish a 24-target run, copy the generated URL, and send it to a
  friend. The URL opens the same fixed campaign with your score displayed as
  the target to beat. It needs no account, matchmaking service, or game server.

See [Multiplayer design](docs/MULTIPLAYER.md) for the hosting and fairness model.

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

## Reference basis

This restoration uses surviving coverage of the original 2009 browser game as
a design reference rather than importing its retired Flash assets. The source
record consistently describes a 24-encounter campaign about A.J. and his
missing brother, a sequence of human faces followed by horse and ostrich
surprises, revolver/SMG/shotgun escalation, and mock-serious praise for the
game's supposedly important story and graphics:

- [MobyGames overview and surviving gameplay description](https://www.mobygames.com/game/43772/close-range/)
- [WIRED's contemporary report on the Onion video](https://www.wired.com/2009/04/video-onion-spe/)
- [Kotaku's contemporary face-or-ear summary](https://kotaku.com/shooting-people-in-the-face-fps-5201200)
- [Game*Spark's contemporary demo playthrough](https://www.gamespark.jp/article/2009/04/08/18430.html)

The original demo largely automated accuracy and imposed no meaningful
penalty. This edition deliberately keeps the later-requested free aim,
anatomical hit zones, scoring, reloads, and split-screen play, while using
critical pull quotes, "moral choice" copy, character dialogue, and absurd
narrative metrics to preserve the original joke: an extremely shallow action
is discussed as if it were culturally profound.

## Run locally

Requires Node.js 22.13 or newer.

```bash
pnpm install
pnpm dev
```

Build and verify:

```bash
pnpm test
pnpm lint
pnpm build:pages
```

## Project note

This is an unofficial tribute and preservation study. The original concept was
created by The Onion. All characters, effects, interface work, story copy, and
audio in this repository are newly created for this browser edition. Four
original low-poly human configurations are assembled entirely from faceted
Three.js geometry, with distinct skulls, jaws, noses, ears, eyes, hair
silhouettes, anatomical colliders, and matching localized damage variants. No
photographs, portrait atlases, external character models, or actor likenesses
are used. The four base heads render at roughly 950-1,100 visible triangles,
including facial features, hair, ears, and the short faceted neck.

The optional brick and concrete PBR materials are CC0 Poly Haven assets and have
512 px and 1K variants. See [the asset ledger](docs/ASSET_LICENSES.md) for source
and retrieval details. A procedural material remains available if an asset fails
to load.
