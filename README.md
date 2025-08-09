# SwipeTree — Buttons Only (Single Display)

Two-area layout (Anchor on top, Results grid below) with buttons for **Parent**, **Siblings**, **Spouse**, **Children**, and **Back**.

- Relationships are inferred from **numeric filenames** only.
- Works with files in the same folder or via the optional **file indexer** (Browse…).
- Fixed grids: Parents 1×2; Siblings/Spouse/Children 3×3.

## Quick Start
1. Open `index.html` in a modern browser.
2. Enter a **Start ID** (e.g., `140000`) → click **Launch**.
3. (Optional) Click **Browse…** to index local images for exact spouse/parent-B matching.
4. Click buttons to populate the result grid; click tiles to change the Anchor.
5. Use **Back** to return to the previous anchor.

## Filenames
- Person: `140000.jpg`
- Spouse (direct): `140000.1.jpg` (always shown if present)
- Spouse (extended, clickable): `140000.1.240000.jpg`
- Children are computed from trailing zeros (see docs).

## Deploy to GitHub Pages
- Create a repo, upload the files to root.
- Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## License
MIT — see `LICENSE`.

---
Detailed build documentation: `docs/SwipeTree_Build_Bible.html`.
Last updated: 2025-08-08
