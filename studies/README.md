# Typewriter Letter — Interaction Studies

Four standalone interaction studies for a sequential "write a letter on a typewriter" prototype. Each folder holds one study as a single self-contained `index.html`, plus a `STUDY.md` describing its components, states, code locations and how it connects to its neighbors. Folders are numbered in sequence order.

| Folder | Study | Step in the sequence | Ends when |
|---|---|---|---|
| `01-feed-the-paper/` | Feel and Feed the Paper | Choose a sheet by touch, load it into the roller | a sheet is fed (`fed`) |
| `02-strike-the-keys/` | Strike the Keys | Type a line on the keyboard | the line is full and the carriage locks (`locked`) |
| `03-return-the-carriage/` | Return the Carriage | Pull the lever to return to a new line | the carriage hits the stop (`done`) |
| `04-sign-and-seal/` | Sign and Seal | Sign, fold, put in the envelope, seal | the flap is sealed (`sealed`) |

Studies 02 and 03 share the same carriage drawing and size (one character = 10.8px, 23 characters per line), so the carriage can carry over directly between them.

## Running

No build step and no packages. Open any `index.html` directly in a modern browser, or serve the folder so all studies share one origin:

```bash
cd typewriter-studies
python3 -m http.server 8000
# then open http://localhost:8000/01-feed-the-paper/  (etc.)
```

Sound uses the Web Audio API and starts after the first click, press or keystroke (browser autoplay rules).

## Dependencies

- **Courier Prime** from Google Fonts — used by `02-strike-the-keys` and `03-return-the-carriage` for typed text; falls back to Courier New / monospace when offline.
- Everything else (graphics, sound) is generated inline: SVG, canvas, CSS and Web Audio. No image or audio files.

## Shared conventions

- Grayscale palette: `--bg #e4e4e3`, `--ink #1b1b1b`/`#2b2b2b`, `--soft #9a9a9a`.
- Each study draws on a fixed-size stage (`#stage`) scaled to fit the window by `fit()`.
- Each has a round Reset button that calls `init()` and runs its animation from one `requestAnimationFrame` `loop()`.
- Studies 01, 03 and 04 have an idle "fingertip" demonstration (`#touch`, `runDemo()`) that stops once the user acts.

The `index.html` files are exported unchanged from the published artifacts.
