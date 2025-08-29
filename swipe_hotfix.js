/* SwipeTree iOS swipe hotfix
   - Capture-phase touch listeners on stage AND anchor
   - preventDefault on touchstart + touchmove
   - Use touches[0] if present (iOS Safari)
   - Lower threshold to 24px
*/
(function(){
  'use strict';

  const stage = document.getElementById('stage');
  const anchorEl = document.getElementById('anchor');

  // If these aren't present, do nothing (defensive)
  if (!stage || !anchorEl) return;

  let touching=false, sx=0, sy=0;
  const THRESH = 24;

  // Utility to extract the active touch (iOS-friendly)
  function getPoint(ev){
    const t = (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]);
    if (!t) return null;
    return { x: t.clientX, y: t.clientY };
  }

  function onStart(ev){
    const p = getPoint(ev);
    if (!p) return;
    touching = true; sx = p.x; sy = p.y;
    // Stop native scrolling/zooming
    try { ev.preventDefault(); } catch {}
  }

  function onMove(ev){
    // Keep page from scrolling while swiping
    try { ev.preventDefault(); } catch {}
  }

  function onEnd(ev){
    const p = getPoint(ev);
    if (!touching || !p) return;
    const dx = p.x - sx, dy = p.y - sy;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    touching = false;
    if (ax < THRESH && ay < THRESH) return;

    // Delegate to app's existing handlers via custom events
    const dir = (ax > ay) ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'up' : 'down');
    document.dispatchEvent(new CustomEvent('swipetree:swipe', { detail: { dir, dx, dy }}));
  }

  // Attach on capture so we run before passive listeners
  const opts = { passive: false, capture: true };
  stage.addEventListener('touchstart', onStart, opts);
  stage.addEventListener('touchmove', onMove, opts);
  stage.addEventListener('touchend', onEnd, opts);
  anchorEl.addEventListener('touchstart', onStart, opts);
  anchorEl.addEventListener('touchmove', onMove, opts);
  anchorEl.addEventListener('touchend', onEnd, opts);
})();