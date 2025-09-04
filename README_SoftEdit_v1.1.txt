SoftEdit v1.1 (drop‑in) — iOS/desktop long‑press editing for labels (Name, DOB)

WHAT THIS IS
- A single add-on file: softedit.js
- Adds a long‑press "Edit Label" modal on the portrait image.
- Talks to your Netlify function: /.netlify/functions/labels?id=<ID>
- Disables iOS image callout / share menu during long‑press.
- No changes to your swipe logic (script.js).

HOW TO INSTALL
1) Put softedit.js in the same folder as your index.html (repo root).
2) Ensure index.html includes the line (usually near the end of <body>):
   <script src="softedit.js" defer></script>
   (It looks like you already have this line — if so, no changes needed.)
3) Open on iPhone Safari with a cache buster once:
   https://allofusbhere.github.io/Family-tree-app/index.html?se=1#id=100000

HOW IT WORKS
- Long‑press (~550ms) on the portrait image opens a modal to edit Name/DOB.
- Person ID is detected from #id=... or the image filename (.../images/12345.jpg).
- Reads/Writes via your Netlify function (GET/POST), with cache‑busting.
- After save, the value is refetched (warming caches) and your UI picks it up.

ROLLBACK
- Delete softedit.js and remove its <script> tag in index.html (if present).

Build: v1.1
