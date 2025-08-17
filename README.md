# SwipeTree — Spouse/Partner Traceability Build
**Date:** 2025-08-17

This build locks the current behavior and adds **spouse/partner management** with **traceability**:

- **Right = Spouse/Partner**
  - Shows `A.1.B.jpg` (traceable if B's first digit is a known branch).
  - Falls back to `A.1.jpg` (partner-only, not traceable).
  - Attempts to detect reciprocal links `B.1.A.jpg` by probing common branch seeds.
- **Up = Parents**
  - Shows Nparent and Oparent if `Nparent.1.B.jpg` exists; otherwise Nparent + placeholder slot.
- **Left = Siblings**, **Down = Children**: placeholder generators remain; keep your verified numeric logic if you have one—drop in where indicated.
- **SoftEdit** long-press only (no hints). Names persist in `localStorage`.

## Files
- `index.html` — shell
- `style.css` — minimal styles
- `script.js` — logic (spouse/partner traceability included)

## How to Deploy
1. Upload all three files to your **app** folder (not the images folder).
2. Ensure your images are in a **flat** folder alongside your existing repo (as you already use).
3. Open `index.html` via GitHub Pages (same pattern as before).

> If you maintain a manifest of filenames, we can wire it in to find reciprocal-only spouse files perfectly. Without a manifest, this build still covers direct `A.1.B.jpg` and `A.1.jpg` patterns.
