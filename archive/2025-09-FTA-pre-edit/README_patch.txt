SwipeTree – Patch: Anchor Image Display & Cache-Busting
======================================================

What this fixes
---------------
1) The anchor placeholder text (“anchor”) sometimes remained visible even after
   the correct image was fetched (due to caching or z-index/visibility state).
2) Images could be cached aggressively on iOS; this build forces a cache-bust
   on every image load to guarantee you see the newest file.

How it works
------------
- The anchor card starts with a placeholder overlay.
- When an image is successfully loaded, the card gets `.has-image` which hides
  the placeholder and shows the `#anchorImg` via CSS.
- Every image URL appends `?cb=<timestamp>` so Safari/iOS can’t serve a stale asset.
- URL hash `#id=140000` still works; the “Start” button or pressing Enter will also set the anchor.
- A minimal back stack is included so the **Back** button returns to the last anchor.

Deploy
------
1) Replace your `index.html`, `style.css`, and `script.js` in your `Family-tree-app` repo root.
2) Commit and open the same GitHub Pages URL. If anything sticks, open DevTools → Network →
   “Disable cache” and hard-reload.

Notes
-----
- This patch is intentionally minimal and should not impact your existing relationship logic.
- It focuses on ensuring the *image visibly replaces* the “anchor” placeholder on load.
