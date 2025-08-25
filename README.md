# SwipeTree rc1c — Primary Integration (no hotfix layering)

This is the clean fix you asked for. It keeps your real logic and integrates the improvements properly.

## What’s included
- **index.html** — Loads your core logic `script.v132.js` first, then the glue `script.js`.
- **style.css** — Adds iOS Safari touch guards (overscroll + touch-action).
- **script.js** — Glue only: iPad swipes, auto-start from URL, image path redirect with extension fallbacks, NBSP cleanup.

## Install
1. Upload all 3 files and replace existing ones.
2. Commit to your working branch (`rc-1b` or create `rc1c`).
3. Open: `https://allofusbhere.github.io/Family-tree-app/index.html?v=rc1c#id=100000`

This is the “fix it right” package — no hooks, no placeholders, ordered scripts, and your full relationship logic untouched.