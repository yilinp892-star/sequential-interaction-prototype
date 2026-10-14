# Study: Sign and Seal

Source: https://claude.ai/artifact/LyFBFesH1UmqUWL7yYMy3H · File: `index.html` (single self-contained page, ~475 lines)

## What the study does

A typed letter sits above an open envelope. The user signs it by drawing on the signature line with ink that behaves like a pen nib; the letter folds itself in half; the user drags the folded letter into the envelope; then holds the flap down until the glue takes and a wax-style seal appears. Each step resists a little — too short a signature fades, a letter dropped short peels back, a flap released too early lifts open.

## Main visual and interactive components

| Component | Element(s) | Notes |
|---|---|---|
| Stage | `#frame`, `#stage` | Fixed 900×640, scaled by `fit()`. Grayscale. |
| Letter | `#letter` with `#topHalf` / `#botHalf` | Two halves so the top can fold over in 3D (`rotateX`). `#topBack` shows the paper's back after 90°. |
| Ink | `#ink` canvas, `#demoInk` canvas | User signature; demo scribble on its own layer. |
| Hit zones | `#signZone`, `#grabZone`, `#pressZone` | Shown/hidden per phase so only the current action is possible. |
| Envelope | `#envInside`, `#envFront`, `#flap` | Inside opens wider as the letter nears; flap rotates closed and darkens as glue sets. |
| Seal | `#seal` | Pops in with an overshoot when sealed. |
| Fingertip / Reset | `#touch`, `#reset` | Demo hint; reset calls `init()`. |

## User actions, feedback, states, transitions

`phase`: `sign` → `folding` → `carry` (⇄ `peelback`) → `inserting` → `seal` → `done`.

1. **Sign** (`sign`) – press on the signature area: an ink dot spreads where the nib lands. Drawing: the nib lags the pointer (easing 0.3); line width thins with speed; fast strokes skip; resting pools ink; scratch sound follows speed.
   - After release it waits 750ms for another stroke. If total stroke length ≥ 110 (`SIGN_MIN`) → fold. Otherwise the ink fades out and resets.
2. **Fold** (`folding`) – top half rotates 180° over 650ms with a paper rustle; letter shrinks to 0.82 and lifts. → `carry`.
3. **Carry** (`carry`) – grab the folded letter: it clings for the first 7px, then peels free with a crackle. It follows the pointer heavily (easing 0.12), tilts with motion, and is pulled into alignment within 160px of the envelope mouth. The envelope inside opens and the flap lifts as it approaches.
   - Release within 85px of the mouth → `inserting`; otherwise → `peelback` (slowly returns home, then back to `carry`).
4. **Insert** (`inserting`) – letter catches at the lip, then slides in (700ms); envelope front bulges slightly. → `seal`.
5. **Seal** (`seal`) – the flap trembles to invite a press. Press and hold: flap swings shut fast; while held, glue darkens and the envelope compresses over ~28 frames with occasional crackles.
   - Released too soon → flap peels back open slowly with a crackle, colors reset.
   - Held through → `done`: low thump, seal pops in, envelope springs back to shape.
6. **Idle demos** (`runDemo`) – per phase, until the user has done that action once: a faint scribble that fades; a pull toward the envelope that clings back; a press on the flap released too soon.

## Where it lives in the code (`index.html`)

| Lines (approx.) | What |
|---|---|
| 4–58 | CSS: letter halves, zones, envelope parts, flap, seal pop transition, reset |
| 61–102 | Markup: flap, envelope inside, letter (halves, canvases, zones), envelope front, press zone, seal, touch, reset |
| 108–118 | `LETTER_SVG`, signature line coordinates, `HOME`, `MOUTH`, `ALIGN`, `SIGN_MIN` |
| 142–151 | `fit()`, `toStage()` |
| 155–184 | Sound: `initAudio()` (looped scratch noise), `burst()`, `crackle()`, `scratch()` |
| 188–204 | `init()` — full state reset |
| 207–226 | Sign: `signZone` pointerdown, `spreadDot()` |
| 228–248 | Global `pointermove` / `pointerup` — pen target, drag cling, release routing |
| 250–280 | `drawInk()`, `checkSignature()` |
| 282–293 | `fold()` |
| 296–319 | Carry: `grabZone` pointerdown, `mouthDist()`, `endDrag()`, `insert()` |
| 322–337 | Seal: `pressZone` pointerdown, `endPress()` |
| 340–389 | `stopDemo()`, `runDemo()` |
| 392–468 | `loop()` — letter motion per phase, fold rendering, flap angle, glue/press progress, seal |

## Dependencies and assets

- None external. Inline SVG + canvas; Web Audio synthesized sound (starts on first press). No build step.

## Hand-off notes for a connected prototype

- **Entry state:** a finished letter (text currently drawn as placeholder grey bars in `LETTER_SVG`). In a chained prototype, render the user's typed lines there instead.
- **Exit state:** `phase === 'done'`, `sealed === true` — the end of the sequence.
