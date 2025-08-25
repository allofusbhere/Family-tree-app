# SwipeTree rc1b-touchfix full package

This build replaces your files (index.html, style.css, script.js) so you don't need to edit code manually.

- Swipe works on iPad (prevents Safari from hijacking gestures).
- Calls `goLeft`, `goRight`, `goUp`, `goDown` (currently placeholders).
- Cleans up stray `\u00A0` labels so blanks don't display weird codes.

## Files
- index.html — base layout, already linked to style.css + script.js
- style.css — includes dark theme and touchfix
- script.js — swipe logic and NBSP cleanup

## Install
1. Upload all 3 files to your Family-tree-app repo (replace existing).
2. Commit and push.
3. Test at your GitHub Pages URL.