# SwipeTree rc1c (domproxy) — Clean fix for $(...).addEventListener null

This build defines a **robust $ helper before your core** so older code that does
`$(...).addEventListener(...)` won't crash if the element isn't immediately available.
It then loads your real `script.v132.js`, followed by the glue enhancements.

Included files (replace these 3):
- index.html (with prelude $ helper, correct script order)
- style.css (iOS touch guards)
- script.js (swipes, autostart, image fallback, NBSP cleanup)

Open: https://allofusbhere.github.io/Family-tree-app/index.html?v=rc1c#id=100000