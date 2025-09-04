
/*! script.v132.js — iPad/Firefox anchor fix (build: v132-ios-fix-1756430371)
 *  - Primary script to render the anchor image early and keep it present
 *  - Reads #id=... from URL hash, injects <img id="anchorPhoto">
 *  - Works alongside script.js; does not attach swipe listeners
 */
(function () {
  const VERSION = "v132-ios-fix-1756430371";
  const IMAGE_BASE = "https://allofusbhere.github.io/family-tree-images/";
  const CACHE = VERSION;
  const ID_RE = /^\d+(?:\.\d+)?$/;

  // --- utils
  const qs = (s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const byText=(t)=>qsa('body *').find(e=>!e.children.length&&(e.textContent||'').trim().toLowerCase()===t);
  const imageUrl=(id)=>`${IMAGE_BASE}${id}.jpg?${CACHE}`;
  const idFromHash=()=> (location.hash.match(/id=([0-9.]+)/)||[])[1] || null;

  function findAnchorContainer(){
    return qs('#anchor') || qs('.anchor') || qs('[data-anchor]') || byText('anchor') || qs('main') || document.body;
  }
  function ensureAnchorImg(container){
    let img = qs('#anchorPhoto', container);
    if (!img) {
      img = document.createElement('img');
      img.id = 'anchorPhoto';
      img.alt = 'anchor';
      Object.assign(img.style, {
        display:'block', maxWidth:'100%', maxHeight:'100%',
        width:'auto', height:'auto', margin:'0 auto', objectFit:'contain'
      });
      container.appendChild(img);
    }
    if ((container.textContent||'').trim().toLowerCase()==='anchor') {
      container.textContent = '';
      container.appendChild(img);
    }
    return img;
  }

  function mount(id){
    if (!ID_RE.test(String(id))) return;
    const c = findAnchorContainer();
    const img = ensureAnchorImg(c);
    const url = imageUrl(String(id));
    if (img.src !== url) img.src = url;
    window.__ANCHOR_ID__ = String(id);
  }

  // Observe DOM rebuilds that could wipe the image
  let mo;
  function observe(){
    const root = document.documentElement;
    if (mo) mo.disconnect();
    mo = new MutationObserver(() => {
      const id = window.__ANCHOR_ID__ || idFromHash();
      if (id) mount(id);
    });
    mo.observe(root, { childList:true, subtree:true });
    // early retries
    setTimeout(()=>{ const id=idFromHash(); if(id) mount(id); }, 50);
    setTimeout(()=>{ const id=idFromHash(); if(id) mount(id); }, 250);
    setTimeout(()=>{ const id=idFromHash(); if(id) mount(id); }, 600);
  }

  function boot(){
    const id = idFromHash();
    if (id) mount(id);
    observe();
    window.addEventListener('hashchange', () => {
      const id = idFromHash();
      if (id) mount(id);
    });
    console.log('[SwipeTree] script.v132.js loaded', VERSION);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
