# Close Range 3D

A playable, fan-made browser restoration of The Onion's 2009 *Close Range*
parody game. This version preserves the original point-blank joke as a real-time
3D campaign with free aiming, built with React and Three.js.

Once GitHub Pages is enabled, the browser build is available at:
[11anthonym.github.io/close-range-3d](https://11anthonym.github.io/close-range-3d/)

## Play

- Move the pointer to aim. Click, tap, or press `Space` to fire.
- Shots outside the target's head miss; move in close and line up the reticle.
- The face, ears, eyes, nose, mouth, animal features, and robot optics are separate
  scoring targets with localized impact effects.
- Complete all 24 point-blank encounters.
- Sound is generated in the browser; no external media assets are used.

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
created by The Onion. All models, environments, effects, interface work, and
audio in this repository are newly created for this browser edition.
