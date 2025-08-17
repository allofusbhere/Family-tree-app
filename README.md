# SwipeTree — Spouse/Partner Traceability (Fixes)
**Date:** 2025-08-17

Fixes included:
- **Image repo** URLs: loads from `https://allofusbhere.github.io/family-tree-images/`
- **Extension probing**: `.jpg` and `.JPG` supported
- **Children step logic**: 
  - `100000` → `110000..190000`
  - `140000` → `141000..149000`
  - Next gens step by `100`, then `10`, then `1`

Drop these over your existing files and refresh with `?cb=2`.
