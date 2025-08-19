# SwipeTree — Spouse Tracing (Right Swipe Only)
This package enables spouse tracing today: **right swipe toggles between the current person and their spouse**.

- Images load from: `https://allofusbhere.github.io/family-tree-images/ID.jpg`
- Start person can be set with `?id=140000` or `#140000` in the URL. Defaults to `100000`.
- Spouse resolution order:
  1. `spouse_links.json` direct map (e.g., `"140000": "240000"`)
  2. Reverse map (e.g., `"240000": "140000"`)
  3. Fallback to `.1` file (e.g., `140000.1`)
- Right swipe (or keyboard →) toggles A ↔ B.
- No other gestures are active in this build (parents/children/siblings are off).

Update `spouse_links.json` to add explicit cross-branch spouse pairs.
