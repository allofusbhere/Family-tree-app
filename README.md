# SwipeTree rc1c-domguard+grid+notice

Adds the missing elements your core expects:
- `#grid` (overlay) and `#notice` (message area).
Prevents `notice.classList is undefined` and `grid.classList is undefined` errors.

Also includes:
- DOM binding guard (before core) to avoid $(...).addEventListener null.
- Blank favicon link to prevent 404 noise.

Replace files:
- index.html
- style.css

Keep your existing script.v132.js and script.js as-is.

Open:
https://allofusbhere.github.io/Family-tree-app/index.html?v=rc1cdom#id=100000