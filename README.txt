SwipeTree — Primary Code Update (v5)

This package updates your **primary app files** (no hotfix layer). It bakes the
anchor/label corrections directly into `script.js`, keeping your relationship
logic hooks intact.

Included:
- index.html
- style.css
- script.js

Highlights:
- Tapping any grid tile anchors to THAT ID (fixes spouse re-appearing + name carryover).
- Proper history/back behavior and URL hash updates (#id=...).
- Single overlay with a generic 3×3 grid renderer (max 9 items).
- Swipe gestures: Right=Spouse, Left=Siblings, Up=Parents, Down=Children.
- Uses your existing relationship calculators when available:
  fetchSpouseItems(currentId), fetchSiblingItems(currentId),
  fetchParentItems(currentId), fetchChildItems(currentId).
  (If not present, the grid just won't open for that direction.)

Install:
1) Download this ZIP.
2) Replace your current index.html, style.css, and script.js.
3) Ensure your calculators are exposed globally with those fetch* names
   returning arrays like: [{ id: "141000", label: "Alex" }, ...]
4) Image files should be flat in the same folder and named like: 140000.jpg

You can keep your existing calculator code in a separate script file; this update
doesn't overwrite that logic—only the core app shell and event handling.