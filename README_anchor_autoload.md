
# Drop-in spouse patch (with anchor auto-loader)

- Loads `spouse_link.json` as pairs `[root, partner]` (first is root).
- Forces images to load from your images repo via `IMAGE_BASE`.
- Auto-loads the anchor image:
  - from the URL hash `#id=...` on page load
  - or when you type an ID in the "Enter starting ID" box and click Start/press Enter.
- Injects `<img id="anchorImg">` if missing and sets its `src` to `ID.jpg` (rewritten to images repo).

You can test quickly by navigating to `index.html#id=100000` and reloading.
