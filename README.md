# sequential-interaction-prototype
codebase for my sequential interaction project in ixd 107-03, working with claude code

## Live site

https://yilinp892-star.github.io/sequential-interaction-prototype/

## Appearance panel

The panel is currently hidden: set `SHOW_PANEL` to `true` at the top of `docs/js/look.js` to show it again. While hidden, the prototype always opens with the saved defaults.

The prototype (`docs/`) has a floating, collapsible panel on the left for tuning its look: atmosphere, the four papers, the typewriter body, keys, type and ink, and the fold and drawer. It opens in a fresh look (pale mint, clean white papers with mint rules and a coral margin, sage typewriter, cream keys, soft teal ink); those saved defaults are the `SAVED` block in `docs/js/look.js`. There are four presets: Original (the first grey look), Morning, Night and Old letter. Settings are kept in the browser across reloads. "Reset to defaults" returns to the saved defaults. "Copy settings" copies every value so it can be saved as the new defaults.
