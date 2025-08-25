# SwipeTree rc1a — GitHub Pages friendly
- **Fix:** No Netlify call on `*.github.io` (no 404 noise); labels fall back to localStorage.
- **Fix:** Overlay guaranteed hidden on load; only opens with a real title + tiles.
- Swipes: left = siblings, right = spouse, up = parents, down = children.
- Spouse linking uses `spouse_link.json` (symmetric).