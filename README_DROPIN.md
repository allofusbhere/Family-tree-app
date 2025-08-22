
# SwipeTree App Repo Drop-In (2025-08-22)

**What to upload to your *app* repo root:**
- `netlify/functions/labels.js`
- `netlify.toml`
- `style.css` (replace your existing one)
- `labels.js` (client helper)
- `app-hook.js` (optional glue)

## Easiest upload path (no Git CLI)
1. Download and unzip this archive.
2. In GitHub: open your **app repo** → **Add file** → **Upload files**.
3. Drag the entire **`netlify` folder** AND the files (`style.css`, `labels.js`, `app-hook.js`, `netlify.toml`) into the drop zone in one shot.
   - GitHub preserves the folder structure (`netlify/functions/...`).
4. Commit changes.
5. In the app HTML, include (if not already using modules):
   ```html
   <script type="module" src="./labels.js"></script>
   <script type="module" src="./app-hook.js"></script>
   ```
6. Netlify: no extra config beyond `npm install @netlify/blobs` in your build environment (once). Deploy.

That's it. Your images repo stays *unchanged*. Only the app repo needs these files.
