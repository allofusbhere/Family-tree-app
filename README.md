# SwipeTree (iPad build) — Test Package

This build restores **swipe navigation**, fixes **spouse anchoring**, and keeps the **numeric relationship logic** strictly derived from the 6‑digit ID (with optional `.1` spouse portraits).

## Gestures
- **Right** → Spouse (uses `spouse_link.json` if present; otherwise shows `.1` portrait)
- **Up** ↑ Parents (shows computed Parent 1 and a placeholder tile for Parent 2)
- **Left** ← Siblings (varies the highest non‑zero digit, zeroing the rest)
- **Down** ↓ Children (varies the next lower digit after the highest non‑zero)

Tap any tile to **navigate and close** the grid. **Back** button closes an open grid first, then pops navigation history.

## Image Hosting
Set the base image path inside `script.js`:
```js
const BASE_IMAGE_URL = "https://allofusbhere.github.io/family-tree-images/";
```
The app tries `ID.jpg` exactly as you name your files, including spouse portraits like `240000.1.jpg`. If a file is missing, it shows `placeholder.jpg` from the same folder.

## Labels
- Tries to read from Netlify at `/.netlify/functions/labels` (GET → JSON object `{ "140000": "Aaron", ... }`).
- Falls back to `localStorage` (`swipetree_labels`). Long‑press (600ms) on the **anchor** to soft‑edit a name.

A minimal stub for Netlify is provided in `netlify/functions/labels.js`. This build **does not write** back to Netlify (read‑only).

## Spouse Linking
Edit `spouse_link.json` to pair base IDs. The mapping is **symmetric** at load:
```json
{ "140000": "240000", "240000": "140000" }
```
Only base IDs go here (no `.1`). The grid shows the partner's `.1` image when available, and **navigates to the partner's base ID** (so you can swipe up/left/down on them).

## Start ID & URL Hash
Enter an ID and press **Start**, or pass `#id=140000` in the URL. The query param `?v=<anything>` is preserved so you can version your links.

## Known & Intentional
- Up shows only one computed parent plus a placeholder for Parent 2 (future enhancement).
- Relationship math follows your documented rules and avoids any hard‑coding of specific people.
