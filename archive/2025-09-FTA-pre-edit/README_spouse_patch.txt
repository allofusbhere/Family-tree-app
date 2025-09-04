SwipeTree – Spouse Tracing Patch (Button-Only)
==============================================

What this adds
--------------
- Loads `spouse_link.json` and enables a **Spouse** button that jumps to the partner’s
  *main* ID (e.g., 140000 ⇄ 240000). This sets the spouse as the new anchor.
- History-safe: Back returns to the previous anchor.
- Cache-busting on images and on spouse map to avoid stale loads.

How to test
-----------
1) Upload the 4 files into your `Family-tree-app` repo root (replace existing index/style/script).
2) Confirm `spouse_link.json` includes your pair(s). Example mapping included:
       140000 -> 240000, 240000 -> 140000
3) Open your usual URL: `.../index.html#id=140000`
4) Click **Spouse** → should jump to `240000` and show her image as anchor.
5) Click **Back** → should return to `140000`.

Notes
-----
- This patch is button-only. If you want swipe-right=spouse, we can hook the same `goSpouse()`
  into the gesture layer next.
- Parents/Siblings/Children logic is untouched and will use whichever version you currently have.
