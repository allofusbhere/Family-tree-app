
/* app-hook.js — rc2e (Immediate Fixes integrated with historyStack)
   Scope: UI-only. Does NOT touch relationship math.
   Implements:
   1) Back button (grid-first close; else pop historyStack; else history.back())
   2) Parents overlay centered (two-up; placeholder-safe; hides anchor behind)
   3) Anchor highlight (light bg + glow)
*/
(function(){
  const CSS = `
  :root { --anchor-bg: rgba(255, 255, 200, 0.35); --anchor-glow: 0 0 12px rgba(255, 255, 0, 0.6); }
  .anchor-wrap.highlight { background: var(--anchor-bg); box-shadow: var(--anchor-glow); border-radius: 16px; transition: box-shadow 120ms ease, background 120ms ease; }
  .overlay.parents { position: fixed; inset: 0; display: none; background: rgba(0,0,0,0.7); z-index: 1100; }
  .overlay.parents.open { display: grid; place-items: center; }
  .overlay.parents .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center; justify-items: center; padding: 2rem; }
  .overlay.parents .parent-slot { width: min(38vw, 38vh); height: min(38vw, 38vh); display: grid; place-items: center; background: #111; border-radius: 18px; overflow: hidden; border: 1px solid rgba(255,255,255,0.2); }
  .overlay.parents .parent-slot img { width: 100%; height: 100%; object-fit: contain; }
  .overlay.parents .placeholder { opacity: 0.35; font: 600 1rem system-ui, sans-serif; color: #fff; }
  #st-back-btn { position: fixed; top: 14px; left: 14px; z-index: 1200; padding: 10px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.25); background: rgba(0,0,0,0.55); color: #fff; font: 600 14px system-ui, sans-serif; backdrop-filter: blur(6px); cursor: pointer; }
  #st-back-btn:active { transform: translateY(1px); }
  `;

  function injectCSS(){
    if (document.getElementById('st-rc2e-css')) return;
    const s=document.createElement('style'); s.id='st-rc2e-css'; s.textContent=CSS; document.head.appendChild(s);
  }

  function toggleAnchorHidden(hide){
    const wrap = document.querySelector('.anchor-wrap') || document.querySelector('#anchor')?.parentElement;
    if (!wrap) return;
    if (hide){ wrap.setAttribute('aria-hidden','true'); wrap.style.visibility='hidden'; }
    else { wrap.removeAttribute('aria-hidden'); wrap.style.visibility='visible'; }
  }

  function ensureParentsOverlay(){
    let overlay = document.querySelector('.overlay.parents');
    if (!overlay){
      overlay = document.createElement('div');
      overlay.className = 'overlay parents';
      overlay.innerHTML = `<div class="grid">
        <div class="parent-slot" data-slot="p1"><div class="placeholder">Missing</div></div>
        <div class="parent-slot" data-slot="p2"><div class="placeholder">Missing</div></div>
      </div>`;
      overlay.addEventListener('click', (e)=>{ if(e.target===overlay) closeParents(); });
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function fillSlot(slot, src){
    slot.innerHTML='';
    if (src){
      const img=document.createElement('img'); img.alt='Parent'; img.decoding='async'; img.loading='eager'; img.src=src; slot.appendChild(img);
    } else {
      const ph=document.createElement('div'); ph.className='placeholder'; ph.textContent='Missing'; slot.appendChild(ph);
    }
  }

  function openParents(p1Src, p2Src){
    const overlay = ensureParentsOverlay();
    const s1 = overlay.querySelector('[data-slot="p1"]');
    const s2 = overlay.querySelector('[data-slot="p2"]');
    fillSlot(s1, p1Src || null);
    fillSlot(s2, p2Src || null);
    overlay.classList.add('open');
    toggleAnchorHidden(true);
  }

  function closeParents(){
    const overlay = document.querySelector('.overlay.parents');
    if (overlay){ overlay.classList.remove('open'); }
    toggleAnchorHidden(false);
  }

  function ensureBack(){
    if (document.getElementById('st-back-btn')) return;
    const btn = document.createElement('button');
    btn.id='st-back-btn'; btn.type='button'; btn.textContent='Back';
    btn.addEventListener('click', ()=>{
      // 1) Close any open overlay grid first
      const openGrid = document.querySelector('.overlay.parents.open, .overlay.siblings.open, .overlay.children.open, .overlay.spouse.open');
      if (openGrid){ 
        openGrid.classList.remove('open'); 
        if (openGrid.classList.contains('parents')) toggleAnchorHidden(false);
        return; 
      }
      // 2) Pop historyStack if available
      const hs = window.historyStack;
      if (Array.isArray(hs) && hs.length > 1){
        hs.pop(); // remove current
        const prev = hs[hs.length-1];
        // prev could be an ID or an object {id: '140000'}
        const id = (prev && typeof prev === 'object') ? (prev.id || prev.anchor || prev.value) : prev;
        if (id){ 
          try { location.hash = '#id=' + id; } catch(e){}
          if (typeof window.go === 'function'){ try{ window.go(id); }catch(e){} }
        }
        return;
      }
      // 3) Fallback to browser history (guaranteed no dead clicks)
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

  // Listen for a core event to show parents with real images
  function hookCore(){
    document.addEventListener('swipetree:showParents', (e)=>{
      const d = (e && e.detail) || {};
      openParents(d.parent1Src || null, d.parent2Src || null);
    });
  }

  function init(){ injectCSS(); ensureBack(); ensureParentsOverlay(); highlightAnchor(); hookCore(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
