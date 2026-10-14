# Study: Return the Carriage

Source: https://claude.ai/artifact/Didmb6scUQx5UVZWy8YLWm · File: `index.html` (single self-contained page, ~370 lines)

## What the study does

A typewriter carriage has reached the end of a line ("Dear you, I wrote this "). The user grabs the return lever and pulls it to the right. The carriage moves notch by notch along a track; a full pull (or a firm flick that coasts the rest of the way) slams it against the stop, the paper rolls up one line, and a blinking marker appears at the start of the new, empty line. A short or weak pull springs back.

## Main visual and interactive components

| Component | Element(s) | Notes |
|---|---|---|
| Stage | `#frame`, `#stage` | Fixed 1000×580, scaled by `fit()`. Grayscale. Carriage is the same size as in `02-strike-the-keys` ("Study 2" in the code comment). |
| Carriage | `#carriage` (SVG body) | Paper + platen + knobs; moves via `translateX`. |
| Typed text | `#paperClip` › `#lines` › `.line` | Monospace lines (Courier Prime). `#lines` translates up as the paper rolls. |
| Roller stripes | `#stripes` | Shift with the paper to show the platen turning. |
| Lever | `#lever`, `#grip`, `#gripPulse` | Lever SVG rotates (tilt) under tension; `#grip` is the hit area; `#gripPulse` is a ping ring inviting a grab. |
| Indicator needle | `#needle` | Pointer hanging from the carriage down to the track. |
| Track | `#track` (SVG, built in `buildTrack()`) | Rail with 23 notches + end stop; notches darken as they are passed. |
| New-line marker | `#marker` | Blinking underscore cursor shown after the return. |
| Fingertip / Reset | `#touch`, `#reset` | Demo hint; reset calls `init()`. |

## User actions, feedback, states, transitions

State variables: `drag` (holding), `coast` (momentum), `done` (returned), `notch` (0–23).

1. **Idle** – `#gripPulse` pings. Before first interaction, a fingertip demo presses the grip, pulls 4 notches, lets go, and the carriage springs back (`runDemo`).
2. **Grab** (pointerdown on `#grip`) – click sound, lever tilts 8°.
3. **Tension** – the first 8px (`STICK`) of pull only tilts the lever further; then the hook releases with a click (`drag.hooked = true`).
4. **Pull** – horizontal drag maps to notches of 10.8px (`CW`). Each new notch: rising-pitch click, carriage snaps to it with a stiff spring, paper rolls up proportionally, track notches fill in.
5. **Release**
   - at notch 23 → `finish()`;
   - fast pull (> 0.45 px/ms over last ~90ms) → `coast`: carriage glides on momentum, still clicking through notches; reaches the end → `finish()`, or loses speed → `springBack()`;
   - otherwise → `springBack()`: sliding sound, carriage returns to notch 0, pulse resumes after 0.9s.
6. **Finish** – thud at the stop, small bounce, paper settles exactly one line up, a new empty line is added and the blinking marker appears with a high tick. Input is disabled (`done`) until Reset.

## Where it lives in the code (`index.html`)

| Lines (approx.) | What |
|---|---|
| 5 | Google Fonts link (Courier Prime) |
| 6–66 | CSS: carriage, lines, stripes, lever/grip, `ping` pulse, track, marker `blink`, reset |
| 69–106 | Markup: track, carriage SVG, needle, paper clip, lever, marker, touch, reset |
| 110–121 | Constants: `CW`, `STEPS`, `TRAVEL`, `STICK`, `LINE_H`, `TEXT` |
| 136–141 | `fit()` |
| 145–180 | Sound: `initAudio()`, `click()`, `thud()`, `slide()` |
| 183–195 | `buildTrack()` — rail, notches, stop |
| 198–216 | `init()`, `addLine()`, `toStage()` |
| 222–250 | Grip `pointerdown` and global `pointermove` — hook tension, notch mapping |
| 252–301 | `setNotch()`, `pullSpeed()`, `endDrag()`, `springBack()`, `finish()` |
| 304–322 | `runDemo()` — idle fingertip |
| 325–360 | `loop()` — coasting, spring, paper roll, lever tilt, notch fill, marker position |

## Dependencies and assets

- **Google Fonts: Courier Prime** (`fonts.googleapis.com`). Optional — falls back to Courier New / Courier / monospace offline.
- Sound synthesized with Web Audio (starts on first grab). No images, no build step.

## Hand-off notes for a connected prototype

- **Entry state:** a line already typed and the carriage at the end of it (`FULL_LEFT`, `TEXT`). In a chained prototype, replace `TEXT` with the line the user typed in `02-strike-the-keys`.
- **Exit state:** `done === true`, a new empty line with the marker — the cue to continue typing, or to move on to signing.
