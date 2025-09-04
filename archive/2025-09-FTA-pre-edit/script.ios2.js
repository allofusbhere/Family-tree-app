
/*
  SwipeTree — iPad-first fix (script.ios2.js)
  - New filename ensures Safari/Firefox fetch a fresh script
  - Injects <img id="anchorPhoto"> into the anchor container and keeps it present
  - Images load from images repo with cache-buster
  - Spouse tracing from spouse_link.json ([root, partner], first = root)
  - Viewport + --vh fix for iPad sizing
  - Minimal: doesn't interfere with your swipe handlers
*/

(function () {
  const IMAGE_BASE = "https://allofusbhere.github.io/family-tree-images/";
  const CACHE = "v=ios2"; // bump to invalidate across devices
  const ID_RE = /^\d+(?:\.\d+)?$/;

  // --- viewport & CSS safe area
  (function setupViewport(){
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
      @supports(padding: env(safe-area-inset-top)) {
        body { padding-bottom: env(safe-area-inset-bottom); }
      }
      #anchorPhoto {
        display:block; max-width:100%; max-height:100%;
        width:auto; height:auto; margin:0 auto; object-fit:contain;
      }
    `;
    document.head.appendChild(style);
    const set = () => document.documentElement.style.setProperty('--vh', (window.innerHeight*0.01)+'px');
    set(); window.addEventListener('resize', set, {passive:true}); window.addEventListener('orientationchange', set, {passive:true});
  })();

  // --- utils
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const byText = (txt) => qsa('body *').find(e => !e.children.length && (e.textContent||'').trim().toLowerCase()===txt);
  const imageUrl = (id) => `${IMAGE_BASE}${id}.jpg?${CACHE}`;
  const idFromHash = () => (location.hash.match(/id=([0-9.]+)/)||[])[1];

  // --- spouse links
  const STATE = { spouseOf:new Map(), rootOf:new Map(), pairs:[] };
  const isDotOne = (id) => String(id).endsWith('.1');
  const baseOf = (id) => isDotOne(id) ? String(id).slice(0,-2) : String(id);
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
    } catch(e) { console.warn('[SwipeTree] spouse_link.json not loaded', e); }
  }

  // --- anchor photo
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
    // clear literal "anchor" placeholder if present
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

  // keep photo present even if DOM changes
  let mo;
  function watchAnchor(){
    const c = findAnchorContainer();
    if (mo) mo.disconnect();
    mo = new MutationObserver(() => {
      const id = window.__ANCHOR_ID__ || idFromHash();
      if (!id) return;
      const img = ensureAnchorImg(c);
      const url = imageUrl(id);
      if (img.src !== url) img.src = url;
    });
    mo.observe(c, {childList:true, subtree:false, characterData:true});
  }

  // --- start box
  function wireStart(){
    const input = qsa('input').find(el => /starting id/i.test(el.placeholder||'')) || qs('input[type="text"]');
    const startBtn = qsa('button,.btn').find(el => /start/i.test(el.textContent||''));
    const go = () => { const v=(input&&input.value||'').trim(); if (ID_RE.test(v)) setAnchor(v); };
    if (startBtn) startBtn.addEventListener('click', go);
    if (input) input.addEventListener('keydown', e => { if (e.key==='Enter') go(); });
  }
  function onHash(){ const id=idFromHash(); if (id) setAnchor(id); }

  // --- public API
  window.SwipeSpouse = Object.assign(window.SwipeSpouse||{}, {
    getSpouse(id){ return STATE.spouseOf.get(String(id)) || null; },
    getChildrenRoot(id){ const s=String(id); if (STATE.rootOf.has(s)) return STATE.rootOf.get(s); if (isDotOne(s)) return null; return s; },
    async rightSwipeTarget(id){ const s=String(id); if (isDotOne(s)) return baseOf(s); const linked=STATE.spouseOf.get(s); if (linked) return linked; return `${s}.1`; },
    forceAnchor: setAnchor,
    debug(){ return { anchor:window.__ANCHOR_ID__||null, pairs:STATE.pairs, spouseOf:[...STATE.spouseOf], rootOf:[...STATE.rootOf] }; }
  });

  async function boot(){
    await loadSpouseLink();
    wireStart();
    onHash();
    watchAnchor();
    window.addEventListener('hashchange', onHash);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
