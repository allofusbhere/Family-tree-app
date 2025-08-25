UPLOAD **script.js** ONLY (replace existing). No other files.

This preserves your actual app logic (script.v132.js) and fixes iPad swipes.
- Non-passive touch listeners so Safari doesn't steal gestures
- Calls your real goLeft/goRight/goUp/goDown
- Cleans stray NBSP in labels

Steps:
1) Add file → Upload files → script.js (replace)
2) Commit to rc-1b
3) Hard refresh on iPad