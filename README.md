# SwipeTree Restore (v5s)

This package restores **swipe gestures** and fixes **spouse anchoring** with a minimal, stable baseline.

## What works
- **Right swipe = Spouse** overlay. Tap the spouse tile to **anchor** them.
  - Uses `spouse_link.json` for true partner IDs (e.g., 140000 ↔ 240000).
  - Falls back to showing `{id}.1.jpg` if no mapping is found.
- **Back** button: closes an open overlay first, then returns to the previous anchor.
- Prompts for **starting ID** on load (default `100000`). You can also use `#id=140000` in the URL hash.

## What is deferred (placeholders today)
- Left = siblings (preview tiles only)
- Up = parents (reserved)
- Down = children (reserved)

## Image path
Images are loaded from the **family-tree-images** repo (flat folder):
```
https://allofusbhere.github.io/family-tree-images/{ID}.jpg
```

## Files
- `index.html` — app shell
- `style.css` — dark UI
- `script.js` — swipe + spouse anchoring
- `spouse_link.json` — partner ID mapping (two-way)
- `README.md` — this file

## Deploy
Drop these files into your **Family-tree-app** repo (root or a `swipe/` folder).
Open `index.html` on iPad and test:
- Swipe right → spouse appears
- Tap spouse → they anchor (ID label updates)

If you need additional mappings, edit `spouse_link.json` and commit. No code changes required.
