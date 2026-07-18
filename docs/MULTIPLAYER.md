# Multiplayer design

Close Range is published as a static GitHub Pages game, so its multiplayer
menu uses two formats that work without a permanent application server.

## Split-screen versus

Split-screen is the immediate local competitive mode. It runs two independent
Three.js canvases, hit-test pipelines, reticles, damage states, ammunition
counts, target progress counters, and score counters. Player 1 receives the 12
even-numbered campaign encounters and Player 2 receives the 12 odd-numbered
encounters. Successful hits alternate control between the two views; misses
and reloads stay with the current player. Desktop layouts divide the screen
left/right and portrait phone layouts divide it top/bottom.

Both viewports remain live, but each is capped at 24 frames per second and uses
a reduced effects budget. This keeps the combined rendering load practical
while preserving the same geometry, aiming, scoring, and localized damage as
the solo campaign.

## Challenge links

Challenge links are asynchronous multiplayer across browsers. A completed run
encodes its final score in a versioned, bounded URL parameter. Opening that URL
shows a challenge invitation and the score to beat, then launches the same
24-target sequence, weapon route, hit-zone values, and target-index bonuses.
No personal data or gameplay history is stored or transmitted by the game.

The score in a link is intentionally friendly competition rather than an
anti-cheat record: anyone can edit a URL. That is appropriate for this parody
game and avoids pretending a static client can provide authoritative results.

## Why live internet matchmaking is not included

Live remote play would need infrastructure outside GitHub Pages: at minimum a
signaling or relay service, connection lifecycle handling, synchronized game
state, and an authoritative result store. A direct WebRTC implementation would
still need a signaling path and robust NAT fallback. The challenge-link mode
provides a reliable cross-browser option while keeping the published game
fully static and inexpensive to host.
