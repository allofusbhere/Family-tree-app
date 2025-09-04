/* SwipeTree iOS swipe hotfix (wired-in) */
(function(){
  'use strict';
  const stage = document.getElementById('stage');
  const anchorEl = document.getElementById('anchor');
  if (!stage || !anchorEl) return;
  let touching=false, sx=0, sy=0;
  const THRESH = 24;
  function getPoint(ev){
    const t = (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]);
    if (!t) return null; return { x: t.clientX, y: t.clientY };
  }
  function onStart(ev){
    const p = getPoint(ev); if (!p) return;
    touching = true; sx = p.x; sy = p.y;
    try { ev.preventDefault(); } catch {}
  }
  function onMove(ev){ try { ev.preventDefault(); } catch {} }
  function onEnd(ev){
    const p = getPoint(ev); if (!touching || !p) return;
    const dx = p.x - sx, dy = p.y - sy;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    touching = false;
    if (ax < THRESH && ay < THRESH) return;
    const dir = (ax > ay) ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'up' : 'down');
    // Bridge into app behavior: spouse anchors on right; others open overlay
    if (dir === 'right'){ document.querySelector('#stage').dispatchEvent(new MouseEvent('mouseup', {clientX: sx+THRESH+1, clientY: sy})); }
    else { const evt = new Event('openOverlay'); }
    // Directly call minimal behavior by simulating keyboard:
    if (dir === 'right'){ window.dispatchEvent(new CustomEvent('swipetree:swipe', {detail:{dir}})); }
    const e = new CustomEvent('swipetree:swipe', {detail:{dir}}); document.dispatchEvent(e);
  }
  const opts = { passive: false, capture: true };
  stage.addEventListener('touchstart', onStart, opts);
  stage.addEventListener('touchmove', onMove, opts);
  stage.addEventListener('touchend', onEnd, opts);
  anchorEl.addEventListener('touchstart', onStart, opts);
  anchorEl.addEventListener('touchmove', onMove, opts);
  anchorEl.addEventListener('touchend', onEnd, opts);

  // Listen for our custom event and route to the app's logic
  document.addEventListener('swipetree:swipe', (e)=>{
    const dir = e.detail && e.detail.dir;
    const clickLeftRight = (dir === 'left' || dir === 'right');
    // Reuse desktop logic by dispatching synthetic mouse events or by calling minimal handlers:
    if (dir === 'right'){
      // spouse anchor: simulate via hash change to keep behavior consistent
      const img = document.getElementById('anchor');
      if (!img) return;
      // Trigger the same logic as desktop: use a small dx>0
      const up = new MouseEvent('mouseup', {clientX: 100, clientY: 0});
      document.getElementById('stage').dispatchEvent(up);
    } else {
      // For up/left/down, open overlay
      const ev = new MouseEvent('mouseup', {clientX: 0, clientY: dir==='up'?-100:100});
      document.getElementById('stage').dispatchEvent(ev);
    }
  });
})();
