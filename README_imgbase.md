
# Spouse Patch + Image Base

This build sets a configurable `IMAGE_BASE` so your app loads images from your **family-tree-images** repo:

```js
const IMAGE_BASE = "https://allofusbhere.github.io/family-tree-images/";
// or: "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/"
```

It also reads `./spouse_link.json` as pairs `[root, partner]` (first is root).
