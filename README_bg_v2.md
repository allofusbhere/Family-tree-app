
# Drop-in spouse patch v2
- Smarter anchor detection: finds an element whose text is exactly "anchor" if no #anchor/.anchor exists.
- Adds `window.forceAnchor(id)` so you can force-load an ID from the console.
- Keeps spouse JSON pairs, image base, and URL rewriting shims.

Quick test in console:
- `SwipeSpouse.forceAnchor('100000')`
- `SwipeSpouse.forceAnchor('140000')`
