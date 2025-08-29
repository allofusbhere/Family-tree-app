
# Spouse Patch + Image Base + IMG SRC SHIM

**What this does**
- Loads couples from `./spouse_link.json` as pairs `[root, partner]` (first is root).
- Forces **all images** set like `"123456.jpg"` to load from your **family-tree-images** repo via `IMAGE_BASE`.
- This means existing code that still uses local filenames will now automatically resolve to the images repo.

**Changeable setting**
```js
const IMAGE_BASE = "https://allofusbhere.github.io/family-tree-images/";
```

**How the shim works**
- Patches `img.setAttribute('src', ...)` and `img.src = ...`.
- If the value looks like an ID filename (`123456.jpg`, `123456.1.jpg`), it rewrites to `IMAGE_BASE + filename`.
- External URLs and data: URLs are left untouched.
