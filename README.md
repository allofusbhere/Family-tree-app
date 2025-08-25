# SwipeTree rc1c-domguard+grid

This update adds the missing **#grid** element your core expects (it calls `grid.classList.add/remove` in `script.v132.js`).
Without it, you saw: `TypeError: grid.classList is undefined`.

Included:
- index.html — same DOM guard as rc1c_domguard, plus `<div id="grid" class="grid hidden"></div>` inside `#stage`.
- style.css — adds `.grid` overlay + `.hidden` class; keeps iOS touch guards.

Install:
1) Replace **index.html** and **style.css** with these.
2) Keep your existing **script.js** and **script.v132.js** as-is.
3) Open: https://allofusbhere.github.io/Family-tree-app/index.html?v=rc1cdom#id=100000