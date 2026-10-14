# Study: Feel and Feed the Paper

Source: https://claude.ai/artifact/XiNHKSWP4MQM53uWFhzVSR · File: `index.html` (single self-contained page, ~630 lines)

## What the study does

Four sheets of paper lie on a desk above a typewriter roller. The user chooses a sheet by *feeling* it: rubbing each one with the pointer makes it respond differently (slippery, ridged, catching, crinkly), with matching sound and surface marks. Once a sheet has been rubbed enough, its corner curls up; the user picks it up by that corner, carries it to the roller, and the roller pulls it in notch by notch. The other sheets fade away. The end state is one sheet loaded in the roller — the starting point for typing.

## Main visual and interactive components

| Component | Element(s) | Notes |
|---|---|---|
| Stage | `#frame`, `#stage` | Fixed 900×620 desk, scaled to fit width by `fit()`. Grayscale palette in `:root` vars. |
| Four sheets | `.sheet` (built in JS) | Types: `plain`, `lined`, `grid`, `translucent`. Each = SVG paper + `<canvas>` for trail marks + `.curl` shadow + `.corner` curl. |
| Roller | `#roller`, `#stripes` | SVG platen; `#stripes` background shifts to show it turning. Dimmed until a sheet is ready. |
| Slot glow | `#slotGlow` | White glow at the paper slot; pulses once a sheet is ready, brightens as a sheet nears. |
| Ghost outline | `#ghost` | Dashed outline above the slot showing where the sheet goes. |
| Fingertip | `#touch` | Translucent dot used by the idle demonstrations. |
| Reset | `#reset` | Re-runs `init()`. |

## User actions, feedback, states, transitions

**Per-sheet modes** (`s.mode`): `idle` → `rub` → `drag` → (`feed` | `glide` → `feed` | `return` → `idle`).

1. **Hover** – sheet lifts 3px; cursor is `pointer`, or `grab` over a ready sheet's lower edge; the corner "beckons" (faster pulse) when hovering elsewhere on a ready sheet.
2. **Rub (press + move on a sheet)** – each paper answers differently (physics in `FEEL`, sound in `RUB_SOUND`):
   - *plain*: slides along with the hand, low friction; white streak trail; high hiss.
   - *lined*: resists; a small vertical jolt + tick each time the pointer crosses a ruled line.
   - *grid*: catches every 11.2px and jumps 2.6px with a tick, slight random rotation; dot trail.
   - *translucent*: drifts; jittery crinkle trail; uneven, crackly noise.
   - The sheet scales to 0.985 while pressed. Rub distance accumulates in `s.rub`; the corner curl grows with it.
3. **Ready** (`s.rub > 240`) – sheet gets class `ready`, stays lifted 6px, corner pulses, `#ghost` appears, slot starts pulsing, roller brightens to 0.75.
4. **Pick up** – press on the curled lower edge, or keep rubbing off the edge of a ready sheet → `startDrag()`. Sheet follows the pointer, tilts with horizontal velocity, casts a bigger shadow. Within 150px of the slot it is magnetically pulled into alignment and straightens; slot glow and roller brighten with proximity.
5. **Release**:
   - within 110px of the slot → `feed()`;
   - tossed downward toward the slot → `glide` (momentum carries it; feeds if it gets within 26px);
   - otherwise → `return` home with a low tick.
6. **Feed** – snaps square into the guides (200ms), moves into `#clip` (so it is masked by the roller), then advances in 10 notched steps with ticks while `#stripes` turns, ends with a soft click. Other sheets fade out. `fed = true` disables further input until Reset.
7. **Idle demos** – before the user touches anything, a fingertip rubs each sheet in turn (`runDemo`). After a sheet is ready but none has been dragged, the fingertip shows pressing the corner and pulling it down (`runPickupDemo`). Both stop on user input.

## Where it lives in the code (`index.html`)

| Lines (approx.) | What |
|---|---|
| 4–100 | CSS: stage, sheet, curl/corner animations (`nudge`), slot `pulse`, ghost, reset; `prefers-reduced-motion` handling |
| 109–131 | Markup: stage, ghost, roller SVG, stripes, slot glow, clip, touch, reset |
| 141–147 | `SVGS` — the four paper drawings |
| 149–155 | `FEEL` — friction / spring / pull per paper type |
| 165–171 | `fit()` scaling |
| 175–211 | Sound: `initAudio()` (looped band-passed noise), `RUB_SOUND`, `rubSound()`, `tick()` |
| 220–251 | `makeSheet()` — builds each sheet, hover/cursor logic |
| 253–264 | `init()` — reset all state |
| 271–298 | `onDown()`, `startDrag()` |
| 300–372 | Global `pointermove` — rub physics per type, trails, readiness threshold, pick-up-off-edge |
| 374–397 | `endPointer()`, `slotDist()` — release outcomes |
| 400–447 | `tween()`, `feed()` — notched feeding sequence |
| 450–506 | `runDemo()`, `runPickupDemo()` — idle fingertip hints |
| 508–587 | `loop()` — per-frame physics for every mode, corner growth, glow, transforms, shadows |
| 589–622 | `drawTrails()` — streak / dot / crinkle marks on each sheet's canvas |

## Dependencies and assets

- None external. All graphics are inline SVG/CSS; all sound is synthesized with the Web Audio API (starts on first pointer press).
- Any modern browser. No build step.

## Hand-off notes for a connected prototype

- **Exit state:** `fed === true`, one sheet in the roller. The chosen paper is `s.type` of the fed sheet — useful to pass on (e.g. to set the paper texture in the typing study).
- Roller/platen drawing and grayscale tokens (`--bg #e4e4e3`, `--ink`, `--soft`) are shared with the other studies.
