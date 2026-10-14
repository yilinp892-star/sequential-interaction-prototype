# Study: Strike the Keys

Source: https://claude.ai/artifact/H2MDP5Nf9tcMkK4admCa1W · File: `index.html` (single self-contained page, ~350 lines)

## What the study does

A typewriter carriage with a sheet of paper sits above a single type bar and an on-screen keyboard. The user types — on their real keyboard or by pressing the on-screen keys — and each letter is struck onto the paper by the type bar. The carriage steps one character left per letter. Holding a key longer prints a darker letter. Typing too fast jams the type bars and smudges the letter. A bell rings near the end of the line, and at the line's end the carriage locks and keys only knock.

## Main visual and interactive components

| Component | Element(s) | Notes |
|---|---|---|
| Stage | `#frame` (focusable), `#stage` | Fixed 900×670, scaled by `fit()`. Grayscale. `#frame` takes keyboard focus. |
| Carriage | `#carriage` (SVG), `#letters` | Paper, platen, knobs, scale ticks. Moves left via `translateX`. Printed characters are `.ch` divs in `#letters`. |
| Position marker | `#marker` | Blinking underscore at the print point; hidden while a key is held. |
| Type bars | `#bars` › `.bar` (`BAR_SVG`) | One bar at rest (−78°) swings up to 0° to strike. Extra bars are spawned on a jam. |
| Keyboard mirror | `#keys` › `.key` (`.cap`, `.stem`) | Q–P, A–L, Z–M rows + space bar. Mirrors physical key presses and accepts pointer presses. Dimmed (`.locked`) at line end. |
| Reset | `#reset` | Calls `init()` and refocuses the frame. |

## User actions, feedback, states, transitions

Key state: `pos` (characters typed, 0–23), `shown` (carriage steps actually taken), `locked`, `held` (active presses by source).

1. **Press a letter** (physical key or on-screen key) – key cap sinks; the type bar swings up; after 95ms the letter lands at 50% opacity with a low "thunk", the carriage jolts and steps one character (`advance()`, small click).
2. **Hold** – the key sinks deeper (up to 7px) and the letter darkens toward 100% over ~380ms; above 75% it gets a faint bold shadow. **Release** sets the final darkness and returns the bar.
3. **Space** – key sinks, carriage advances one step, nothing prints, no bar swing.
4. **Jam** (a new letter within 60ms of the last) – a second bar spawns and stops short (−9°), the letter prints rotated and offset over the previous character, sharper thunk + click; the carriage doesn't advance. The extra bar is removed on release.
5. **Bell** – at character 18 (`BELL_AT`) a three-partial bell rings.
6. **Line end** – at 23 characters (`MAX`) the carriage locks: keyboard dims, a dull knock plays. Further presses only knock and push the carriage slightly; nothing prints. Reset to start over. (Continuing is handled by the Return the Carriage study.)
7. Accepted physical keys: letters, digits, space and `. , ; : ' " ! ? -`. Modifier combos and auto-repeat are ignored; window blur releases all held keys.

## Where it lives in the code (`index.html`)

| Lines (approx.) | What |
|---|---|
| 5 | Google Fonts link (Courier Prime) |
| 6–68 | CSS: carriage, `.ch` letters, marker `blink`, `.bar`, `.key`/`.cap`/`.stem`, locked state, reset |
| 71–97 | Markup: carriage SVG, letters, marker, bars, keys, reset |
| 101–108 | Constants: `CW`, `LINE_X`, `BASE_Y`, `MAX`, `BELL_AT`, `REST`; `BAR_SVG` |
| 119–124 | `fit()` |
| 128–166 | Sound: `initAudio()`, `thunk()`, `click()`, `bell()` |
| 169–190 | Keyboard mirror: `ROWS`, `addKey()` (pointer handlers) |
| 192–207 | `init()`, `addBar()` |
| 209–256 | `press()` — lock check, space, jam detection, bar swing, letter creation, impact timing |
| 258–279 | `release()` — final darkness, bar return, jam bar cleanup |
| 281–286 | `advance()` — carriage step, bell, lock |
| 288–301 | `KEYMAP`, `keydown` / `keyup` / `blur` listeners |
| 308–341 | `loop()` — carriage spring, key depth, letter darkening, bar swing physics |

## Dependencies and assets

- **Google Fonts: Courier Prime** (`fonts.googleapis.com`). Falls back to Courier New / Courier / monospace offline.
- Sound synthesized with Web Audio (starts on first key or click). No images, no build step.
- Needs keyboard focus on `#frame` to receive physical typing (it focuses itself on load and on any click).

## Hand-off notes for a connected prototype

- **Entry state:** an empty line with the carriage at the start. In a chained prototype, use the paper chosen in Feed the Paper.
- **Exit state:** `locked === true` at 23 characters. The typed text is the `textContent` of `#letters` children in order. That line and carriage position match the entry state of Return the Carriage (same carriage size, `CW = 10.8`, 23 steps).
