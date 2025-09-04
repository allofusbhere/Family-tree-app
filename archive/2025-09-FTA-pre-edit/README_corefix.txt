v133_grid_corefix — children merge + root siblings fallback
Built: 2025-08-29 21:30:13.877420

What changed
- Children grid (▼): now combines children derived from the current ID **and** the spouse.
  This makes pairs share the same children without any overrides.
- Siblings grid (◀): if an ID has **no parent head** (e.g., 100000), we compute siblings as
  other multiples of 10^tz: [step, 2*step, ..., 9*step] excluding self. For 100000, that's
  200000, 300000, ... (only images are shown; blanks are skipped).

How to use
- Replace your current v133_grid `script.js` with this one and deploy.
