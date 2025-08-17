# SwipeTree — Spouse Toggle
**Date:** 2025-08-17

**Right swipe behavior**
- First Right on an anchor ⇒ find **one spouse** (best match: `A.1.B`, else `B.1.A`, else `A.1`) and show it.
- Next Right ⇒ return to the **anchor view**.
- Repeat ⇒ toggles between spouse ↔ anchor. No cycling among multiple image files.

Other notes
- Tap a *linked & traceable* spouse to anchor into them (then that person has their own spouse toggle).
- Gesture-lock and larger spouse image are included.

Reload with `?cb=st1` after replacing the files.
