SoftEdit Install Instructions
================================

This module adds long-press editing (Name + DOB) to SwipeTree without changing swipe logic.

Files included:
- softedit.js
- README_SoftEdit_install.txt

Steps to Install (1 minute):
-----------------------------
1. Upload `softedit.js` into your repo root (same folder as index.html).
2. Open index.html and add the following line just before </body>:

   <script src="softedit.js" defer></script>

3. Commit and deploy.

Usage:
------
- Long-press the person’s photo (~0.5s) to open the edit modal.
- Enter Name and DOB, then Save.
- Data is sent to your Netlify labels function with cache-busting (works across devices).

That’s it! Your swipe logic (script.js) stays untouched.
