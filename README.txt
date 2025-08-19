
SwipeTree — Editing & Two-Parents Centering (Drop‑in Fixes)
===========================================================

What’s fixed
------------
1) **SoftEdit (long‑press to edit)** — Long‑press any person card/image to edit the name label inline. 
   - Saves to localStorage under the person’s numeric ID (key: `swipetree:label:<ID>`).
   - No hint text. Save with Enter; Esc or Cancel closes without saving.

2) **Parents overlay centered** — The parents grid is centered when 1–2 parents are shown 
   (and stays nicely centered for more). Works for overlays with `data-type="parents"` 
   or `#parentsGrid` and a `.grid` container.

3) **Overlay close helper** — Any element with the attribute `[data-overlay-close]` now 
   closes the nearest `.overlay` defensively.

How to install
--------------
1) Upload both files to your app alongside your existing files:
   - `edit_parents_fix.js`
   - `parents_fix.css`

2) Reference them **after** your main CSS/JS in your HTML (typically near the end of `<head>` and before `</body>`):

   ```html
   <link rel="stylesheet" href="parents_fix.css">
   ...
   <script src="edit_parents_fix.js"></script>
   ```

3) No other changes required. These are *drop‑in* and will attach to your existing DOM.

Notes
-----
- This is intentionally light‑touch and won’t disturb your existing swipe/navigation logic.
- Labels use localStorage for now so you can verify editing quickly; we can swap in a shared backend later.
- If you use different classnames/IDs, ping me and I’ll tailor the selectors.
