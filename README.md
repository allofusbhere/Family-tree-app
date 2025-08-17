# SwipeTree — REVERT (Last Night)
**Date:** 2025-08-17

This build removes all spouse/partner changes and restores the simple, stable behavior:
- **Gestures:** Up=Parents, Down=Children, Left/Right=Siblings
- **Images:** 140px thumbnails with `object-fit: contain` (no cropping)
- **Logic:** Children/siblings derived exactly as before; Parents one-level up
- **No timers / no extras**

Drop these files into your repo and reload with `?cb=revert1`.
