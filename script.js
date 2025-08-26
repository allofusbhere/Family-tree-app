
/* SwipeTree script.js — rc2b (Items 1–3)
   - Back button enabled (closes open grid else history.back)
   - Parents overlay centered (two-up), placeholder-safe
   - Anchor highlight (soft background + glow)
   - Minimal swipe-up handler to open Parents overlay (UI-only)
*/
(function(){
  const CSS = `
  :root { --anchor-bg: rgba(255, 255, 200, 0.35); --anchor-glow: 0 0 24px rgba(255, 220, 100, 0.6); }

  .st-layer { position: fixed; inset: 0; pointer-events: none; z-index: 1000; }

  .anchor-wrap.highlight { background: var(--anchor-bg); box-shadow: var(--anchor-glow); border-radius: 16px; transition: box-shadow 120ms ease, background 120ms ease; }

  .overlay.parents { position: fixed; inset: 0; display: none; background: rgba(0,0,0,0.6); z-index: 1100; pointer-events: auto; }
  .overlay.parents.open { display: grid; place-items: center; }
  .overlay.parents .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center; justify-items: center; padding: 2rem; }
  .overlay.parents .parent-slot { width: min(38vw, 38vh); height: min(38vw, 38vh); display: grid; place-items: center; background: #111; border-radius: 18px; overflow: hidden; border: 1px solid rgba(255,255,255,0.2); }
  .overlay.parents .parent-slot img { width: 100%; height: 100%; object-fit: contain; }
  .overlay.parents .placeholder { opacity: 0.35; font: 600 1rem system-ui, sans-serif; color: #fff; }

  #st-back-btn { position: fixed; top: 14px; left: 14px; z-index: 1200; padding: 10px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.25); background: rgba(0,0,0,0.55); color: #fff; font: 600 14px system-ui, sans-serif; backdrop-filter: blur(6px); cursor: pointer; pointer-events: auto; }
  #st-back-btn:active { transform: translateY(1px); }
  `;

  function injectCSS(){
    if (document.getElementById('st-rc2b-css')) return;
    const s = document.createElement('style'); s.id = 'st-rc2b-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function ensureParentsOverlay(){
    let overlay = document.querySelector('.overlay.parents');
    if (!overlay){
      overlay = document.createElement('div');
      overlay.className = 'overlay parents';
      overlay.innerHTML = `<div class="grid">
        <div class="parent-slot" data-slot="p1"><div class="placeholder">No Image</div></div>
        <div class="parent-slot" data-slot="p2"><div class="placeholder">No Image</div></div>
      </div>`;
      overlay.addEventListener('click', (e)=>{ if (e.target===overlay) overlay.classList.remove('open'); });
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function renderParents(p1Src, p2Src){
    const overlay = ensureParentsOverlay();
    const s1 = overlay.querySelector('[data-slot="p1"]');
    const s2 = overlay.querySelector('[data-slot="p2"]');
    function fill(slot, src){
      slot.innerHTML = '';
      if (src){
        const img = document.createElement('img');
        img.alt = 'Parent';
        img.decoding = 'async';
        img.loading = 'eager';
        img.src = src;
        slot.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'placeholder';
        ph.textContent = 'Missing';
        slot.appendChild(ph);
      }
    }
    fill(s1, p1Src);
    fill(s2, p2Src);
    overlay.classList.add('open');
  }

  function ensureBack(){
    if (document.getElementById('st-back-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'st-back-btn';
    btn.type = 'button';
    btn.textContent = 'Back';
    btn.addEventListener('click', ()=>{
      const anyOpen = document.querySelector('.overlay.parents.open, .overlay.siblings.open, .overlay.children.open, .overlay.spouse.open');
      if (anyOpen){ anyOpen.classList.remove('open'); return; }
      if (history.length > 1) history.back();
    });
    document.body.appendChild(btn);
  }

  function highlightAnchor(){
    let wrap = document.querySelector('.anchor-wrap');
    const anchor = document.getElementById('anchor') || document.querySelector('[data-role="anchor"]') || document.querySelector('.anchor');
    if (!wrap && anchor && anchor.parentNode){
      wrap = document.createElement('div');
      wrap.className = 'anchor-wrap';
      anchor.parentNode.insertBefore(wrap, anchor);
      wrap.appendChild(anchor);
    }
    if (wrap) wrap.classList.add('highlight');
  }

  // Minimal swipe-up gesture (UI demo)
  function attachSwipeUp(){
    let startX=0, startY=0, startT=0, active=false;
    const tolAngle = Math.tan(22.5 * Math.PI/180); // ~0.414
    const minDist = 24; // px
    const minVel = 0.25; // px/ms

    function onStart(e){
      const t = e.touches ? e.touches[0] : e;
      startX = t.clientX; startY = t.clientY; startT = Date.now(); active=true;
    }
    function onEnd(e){
      if (!active) return; active=false;
      const t = (e.changedTouches ? e.changedTouches[0] : e);
      const dx = (t.clientX||0) - startX; const dy = (t.clientY||0) - startY; const dt = Math.max(1, Date.now()-startT);
      const dist = Math.hypot(dx, dy); const vel = dist/dt; if (dist < minDist and vel < minVel) return;
      if (Math.abs(dx) > Math.abs(dy) * tolAngle) return; // too horizontal
      if (dy >= 0) return; // not upward
      renderParents(null, null);
    }
    document.addEventListener('touchstart', onStart, {passive:true});
    document.addEventListener('touchend', onEnd, {passive:true});
  }

  // Core integration: show real parents if app dispatches event
  function hookCoreEvents(){
    document.addEventListener('swipetree:showParents', (e)=>{
      const { parent1Src, parent2Src } = (e && e.detail) || {};
      renderParents(parent1Src || null, parent2Src || null);
    });
  }

  function init(){
    injectCSS();
    ensureBack();
    highlightAnchor();
    attachSwipeUp();
    hookCoreEvents();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
