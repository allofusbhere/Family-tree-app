
/*
  SwipeTree script.js — single-file drop-in
  Version: ios3-1756429718
  - iPad/Firefox ready (injects <img id="anchorPhoto"> into the anchor box)
  - Images served from images repo with cache-buster
  - Spouse tracing from spouse_link.json ([root, partner], first = root)
  - Viewport + --vh fix for iPad sizing
  - Minimal: no swipe listeners, preserves your app's behavior
*/

(function () {
  const VERSION = "ios3-1756429718";
  const IMAGE_BASE = "https://allofusbhere.github.io/family-tree-images/";
  const CACHE = VERSION; // unique per build to defeat stubborn caches
  const ID_RE = /^\d+(?:\.\d+)?$/;

  // ----- iPad viewport & CSS sizing
  (function ensureViewport() {
    if (!document.querySelector('meta[name="viewport"]')) {
      const m = document.createElement('meta');
      m.name = 'viewport';
      m.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
      document.head.appendChild(m);
    }
    const style = document.createElement('style');
    style.textContent = `
      :root { --vh: 1vh; }
      #anchor, .anchor, #anchorImg {
        min-height: calc(var(--vh) * 60);
        border-radius: 24px;
      }
      #anchorPhoto {
        display:block; max-width:100%; max-height:100%;
        width:auto; height:auto; margin:0 auto; object-fit:contain;
      }
      @supports(padding: env(safe-area-inset-top)) {
        body { padding-bottom: env(safe-area-inset-bottom); }
      }
    `;
    document.head.appendChild(style);
    const set = () => document.documentElement.style.setProperty('--vh', (window.innerHeight*0.01)+'px');
    set(); window.addEventListener('resize', set, {passive:true});
    window.addEventListener('orientationchange', set, {passive:true});
  })();

  // ----- utilities
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const byText = (txt) => qsa('body *').find(e => !e.children.length && (e.textContent||'').trim().toLowerCase()===txt);
  const imageUrl = (id) => `${IMAGE_BASE}${id}.jpg?${CACHE}`;
  const idFromHash = () => (location.hash.match(/id=([0-9.]+)/)||[])[1];

  // ----- spouse data
  const STATE = { spouseOf:new Map(), rootOf:new Map(), pairs:[] };
  const isDotOne = (id) => String(id).endsWith('.1');
  const baseOf   = (id) => isDotOne(id) ? String(id).slice(0,-2) : String(id);
  function indexPairs(pairs){
    STATE.spouseOf.clear(); STATE.rootOf.clear();
    for (const p of pairs) {
      if (!Array.isArray(p) || p.length!==2) continue;
      const a=String(p[0]).trim(), b=String(p[1]).trim();
      if (!a || !b) continue;
      STATE.spouseOf.set(a,b); STATE.spouseOf.set(b,a);
      STATE.rootOf.set(a,a);  STATE.rootOf.set(b,a);
    }
  }
  async function loadSpouseLink(){
    try {
      const res = await fetch('./spouse_link.json?ts=' + Date.now(), {cache:'no-store'});
      const data = await res.json();
      if (Array.isArray(data)) { STATE.pairs=data; indexPairs(data); }
    } catch(e) { console.warn('[SwipeTree] spouse_link.json load failed', e); }
  }

  // ----- anchor handling
  function findAnchorContainer(){
    return qs('#anchor') || qs('.anchor') || qs('[data-anchor]') || byText('anchor') || qs('main') || document.body;
  }
  function ensureAnchorImg(container){
    let img = qs('#anchorPhoto', container);
    if (!img) {
      img = document.createElement('img');
      img.id = 'anchorPhoto';
      container.appendChild(img);
    }
    if ((container.textContent||'').trim().toLowerCase()==='anchor') {
      container.textContent = '';
      container.appendChild(img);
    }
    return img;
  }
  function setAnchor(id){
    if (!ID_RE.test(String(id))) return;
    const c = findAnchorContainer();
    const img = ensureAnchorImg(c);
    const url = imageUrl(String(id));
    if (img.src !== url) img.src = url;
    window.__ANCHOR_ID__ = String(id);
    try { history.replaceState(null,'', `#id=${id}`); } catch {}
  }

  // Keep photo present even if something rewrites the container
  let mo;
  function watchAnchor(){
    const c = findAnchorContainer();
    if (mo) mo.disconnect();
    mo = new MutationObserver(() => {
      const id = window.__ANCHOR_ID__ || idFromHash();
      if (!id) return;
      const img = ensureAnchorImg(c);
      const url = imageUrl(String(id));
      if (img.src !== url) img.src = url;
    });
    mo.observe(c, {childList:true, subtree:false, characterData:true});
  }

  // ----- start box / hash
  function wireStart(){
    const input = qsa('input').find(el => /starting id/i.test(el.placeholder||'')) || qs('input[type="text"]');
    const startBtn = qsa('button,.btn').find(el => /start/i.test(el.textContent||''));
    const go = () => { const v=(input&&input.value||'').trim(); if (ID_RE.test(v)) setAnchor(v); };
    if (startBtn) startBtn.addEventListener('click', go);
    if (input) input.addEventListener('keydown', e => { if (e.key==='Enter') go(); });
  }
  function onHash(){
    const id=idFromHash();
    if (id) setAnchor(id);
  }

  // ----- public API
  window.SwipeSpouse = Object.assign(window.SwipeSpouse||{}, {
    getSpouse(id){ return STATE.spouseOf.get(String(id)) || null; },
    getChildrenRoot(id){ const s=String(id); if (STATE.rootOf.has(s)) return STATE.rootOf.get(s); if (isDotOne(s)) return null; return s; },
    async rightSwipeTarget(id){ const s=String(id); if (isDotOne(s)) return baseOf(s); const linked=STATE.spouseOf.get(s); if (linked) return linked; return `${s}.1`; },
    forceAnchor: setAnchor,
    version: VERSION,
    debug(){ return { anchor:window.__ANCHOR_ID__||null, version:VERSION, pairs:STATE.pairs, spouseOf:[...STATE.spouseOf], rootOf:[...STATE.rootOf] }; }
  });

  async function boot(){
    await loadSpouseLink();
    wireStart();
    onHash();
    watchAnchor();
    window.addEventListener('hashchange', onHash);
    console.log('[SwipeTree] script.js loaded', VERSION);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
