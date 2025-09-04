SoftEdit install (v1.3) — Family-tree-app

Files included
- softedit.js  (scoped, load-safe; waits for images; iOS callout suppressed)

How to install (no other file edits):
1) Upload softedit.js to the repo root (same folder as index.html).
2) Do not change index.html, script.js, or style.css.
3) Publish.

How it works
- Detects person id from URL hash (#100000 etc.) or from the on-page id input if present.
- Waits for the full page load so the anchor image exists on Safari.
- Attaches a long-press (~0.5s) to the main photo (prefers #anchorImage, then largest <img>).
- GET/POST to /.netlify/functions/labels with cache-busting ts and Cache-Control: no-store.
- Renders the saved name & DOB under the photo.

Rollback
- Delete softedit.js if you want to remove editing; nothing else was touched.