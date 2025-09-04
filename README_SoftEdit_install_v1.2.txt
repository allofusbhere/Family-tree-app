
README_SoftEdit_install_v1.2.txt

Drop-in long‑press “Edit Label” (Name + DOB) for Family-tree-app.
Scope: non-invasive. No changes to script.js or style.css required.

Files in this ZIP:
  • softedit.js  — adds iOS-safe long-press editing and renders the label under the photo
  • README_SoftEdit_install_v1.2.txt — these instructions

Install (about 1 minute):
  1) Upload softedit.js to the repo root (same folder as index.html).
  2) Open index.html and ensure this line appears right before </body>:
       <script src="softedit.js" defer></script>

That’s it. Your current swipe logic stays exactly as-is.
Long‑press the photo to open the Edit dialog. The module:
  • Detects the person id from URL hash (e.g., #id=100000).
  • Targets #anchor / #anchorImage / [data-softedit-target], else the largest visible <img>.
  • Disables iOS image callout (no “Save to Photos” sheet).
  • GETs/POSTs /.netlify/functions/labels with cache-busting (?t=timestamp).
  • Re-renders the label (Name on one line, Year under it) below the image after save.

Rollback:
  • Remove the single <script src="softedit.js"> tag and delete softedit.js.
  • No other files were modified.

v1.2 notes:
  • Adds CSS and JS suppression for iOS long‑press callout.
  • Safer long‑press timing and event cleanup.
  • Scope-limited styling so the swipe pages remain unchanged.
