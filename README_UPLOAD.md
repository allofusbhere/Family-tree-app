
# SwipeTree — Full Drop-In (2025-08-22)

Upload these **directly to your Family-tree-app repo root**. No edits needed.

## What’s included
- `index.html` — already includes `labels.js` and `app-hook.js` (order correct). Keeps your `script.js` if present.
- `style.css` — merged with scroll-lock + larger anchor.
- `labels.js` — client helper for Netlify labels.
- `app-hook.js` — labels everywhere + iOS scroll guard.
- `netlify.toml` — points Netlify to `netlify/functions`.
- `netlify/functions/labels.js` — serverless function using `@netlify/blobs`.

## After upload
1. Commit on GitHub.
2. Netlify will build; make sure `@netlify/blobs` is installed.
   - If you have a package.json, add `"@netlify/blobs": "^6"` and commit, or run once in Netlify build env.
3. Test: long-press an image → save → label appears on all devices. Swipes should not scroll the page.

