# SwipeTree rc1b — app-hook.js touchfix (drop-in)

This ZIP replaces **only** `app-hook.js`. No HTML edits. No CSS edits. No logic removal.

**What it does**
- Restores swipe detection on iPad/iOS Safari (non‑passive listeners).
- Prevents Safari from hijacking gestures (injects minimal CSS at runtime).
- Calls your existing `goLeft`, `goRight`, `goUp`, `goDown` functions — your relationship logic stays intact.
- Cleans the stray `\u00A0` name label.

**Install**
1. Upload **app-hook.js** to your `Family-tree-app` repo root, replacing the existing file.
2. Commit to your working branch (e.g., `rc-1b`).
3. Hard-refresh your GitHub Pages link on iPad.

If swipes still don’t fire, confirm your main surface has one of: `#stage`, `.stage`, or `#anchor`.