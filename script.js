
/*
  SwipeTree — unified script.js (drop-in replacement; no HTML edits required)
  - Spouse tracing via spouse_link.json pairs [root, partner] (first = root)
  - Loads images from images repo; supports <img src> and CSS background-image url(...)
  - Adds ?v=ios1 cache-buster to image URLs (works around iOS caching)
  - Injects viewport meta + --vh fix for iPad/Safari sizing
  - Auto-detects the "anchor" box; exposes SwipeSpouse.forceAnchor(id)
*/

(function () {
  const IMAGE_BASE = "https://allofusbhere.github.io/family-tree-images/";
  const CACHE_BUSTER = "v=ios1";
  const ID_RE = /^\d+(?:\.\d+)?$/;
  const FILE_RE = /(\b\d+(?:\.\d+)?\.(?:jpg|jpeg|JPG|JPEG)\b)/;
  const URL_FN_RE = /url\(([^)]+)\)/gi;

  // ---------- iOS viewport & CSS fixes ----------
  (function iosViewportFix(){
    const hasViewport = document.querySelector('meta[name="viewport"]');
    if (!hasViewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
      document.head.appendChild(meta);
    }
    function setVh() {
      document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
    }
    setVh();
    window.addEventListener('resize', setVh, { passive: true });
    window.addEventListener('orientationchange', setVh, { passive: true });

    const style = document.createElement('style');
    style.textContent = `
      #anchor, .anchor, #anchorImg {
        min-height: calc(var(--vh) * 60);
        background-size: contain !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        border-radius: 24px;
      }
      @supports(padding: env(safe-area-inset-top)) {
        body { padding-bottom: env(safe-area-inset-bottom); }
      }
    `;
    document.head.appendChild(style);
  })();

  // ---------- URL helpers & rewriters ----------
  function addCacheBuster(url) {
    if (!url) return url;
    return url.includes('?') ? `${url}&${CACHE_BUSTER}` : `${url}?${CACHE_BUSTER}`;
  }
  function toImageUrl(filenameOrId) {
    if (!filenameOrId) return filenameOrId;
    const s = String(filenameOrId).replace(/^["']|["']$/g, '');
    if (s.startsWith('http') || s.startsWith('data:')) return s;
    if (ID_RE.test(s)) return addCacheBuster(IMAGE_BASE + s + '.jpg');
    if (FILE_RE.test(s)) return addCacheBuster(IMAGE_BASE + s);
    return filenameOrId;
  }
  function rewriteUrlFns(cssVal) {
    if (!cssVal || typeof cssVal !== 'string') return cssVal;
    return cssVal.replace(URL_FN_RE, (m, path) => {
      const cleaned = String(path).trim().replace(/^["']|["']$/g, '');
      if (cleaned.startsWith('http') || cleaned.startsWith('data:')) return `url(${path})`;
      if (FILE_RE.test(cleaned) || ID_RE.test(cleaned.replace(/\.jpg$/i,''))) {
        const out = toImageUrl(cleaned);
        return `url("${out}")`;
      }
      return `url(${path})`;
    });
  }

  // IMG & CSS shims (so old code paths that set "ID.jpg" still work)
  ;(function installRewriters(){
    const origSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
      if (name === 'src' && this instanceof HTMLImageElement && typeof value === 'string') {
        value = toImageUrl(value);
      }
      if (name === 'style' && typeof value === 'string') {
        value = rewriteUrlFns(value);
      }
      return origSetAttribute.call(this, name, value);
    };
    const imgProto = HTMLImageElement.prototype;
    const origSrc = Object.getOwnPropertyDescriptor(imgProto, 'src');
    if (origSrc && origSrc.set) {
      Object.defineProperty(imgProto, 'src', {
        configurable:true, enumerable:true,
        get: origSrc.get,
        set(v){ return origSrc.set.call(this, toImageUrl(v)); }
      });
    }
    const styleProto = CSSStyleDeclaration.prototype;
    const origSetProp = styleProto.setProperty;
    styleProto.setProperty = function(prop, value, priority){
      if (typeof value === 'string' && /background/i.test(prop)) value = rewriteUrlFns(value);
      return origSetProp.call(this, prop, value, priority);
    };
    const bgDesc = Object.getOwnPropertyDescriptor(styleProto, 'backgroundImage');
    if (bgDesc && bgDesc.set) {
      Object.defineProperty(styleProto, 'backgroundImage', {
        configurable:true, enumerable:true,
        get: bgDesc.get,
        set(v){ return bgDesc.set.call(this, rewriteUrlFns(v)); }
      });
    }
    function rewriteExistingInlineStyles(){
      document.querySelectorAll('[style*="url("]').forEach(el => {
        el.setAttribute('style', rewriteUrlFns(el.getAttribute('style')));
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', rewriteExistingInlineStyles);
    } else {
      rewriteExistingInlineStyles();
    }
  })();

  // ---------- spouse-link loading ----------
  const STATE = { loaded:false, pairs:[], spouseOf:new Map(), rootOf:new Map() };
  function isDotOne(id){ return typeof id==='string' && id.endsWith('.1'); }
  function baseOf(id){ return isDotOne(id) ? id.slice(0,-2) : id; }
  function imageUrl(id){ return addCacheBuster(IMAGE_BASE + `${id}.jpg`); }
  function indexPairs(pairs){
    STATE.spouseOf.clear(); STATE.rootOf.clear();
    for (const pair of pairs){
      if (!Array.isArray(pair) || pair.length !== 2) continue;
      const a = String(pair[0]).trim(), b = String(pair[1]).trim();
      if (!a || !b) continue;
      STATE.spouseOf.set(a,b); STATE.spouseOf.set(b,a);
      STATE.rootOf.set(a,a);  STATE.rootOf.set(b,a);
    }
  }
  async function loadSpouseLink(){
    try {
      const res = await fetch('./spouse_link.json', { cache:'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('spouse_link.json must be an array of [root, partner]');
      STATE.pairs = data; indexPairs(data); STATE.loaded = true;
      document.dispatchEvent(new CustomEvent('spouseLinkReady', { detail:{ pairs:data } }));
    } catch (err) {
      console.warn('[SwipeSpouse] spouse_link.json load failed:', err);
      STATE.loaded = true;
      document.dispatchEvent(new CustomEvent('spouseLinkReady', { detail:{ pairs:[], error:String(err) } }));
    }
  }

  // ---------- anchor auto-detect & load ----------
  function findAnchorEl() {
    let el = document.getElementById('anchor') ||
             document.querySelector('.anchor') ||
             document.querySelector('[data-anchor]');
    if (el) return el;
    el = [...document.querySelectorAll('body *')].find(e => (e.childElementCount === 0) && (e.textContent||'').trim().toLowerCase() === 'anchor');
    return el || document.querySelector('main') || document.body;
  }
  function setAnchor(id){
    if (!id || !ID_RE.test(id)) return;
    const el = findAnchorEl();
    el.style.backgroundImage = `url(${id}.jpg)`; // rewritten to IMAGE_BASE + cache-buster
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
    if ((el.textContent||'').trim().toLowerCase() === 'anchor') el.textContent = '';
    window.__ANCHOR_ID__ = id;
    try { history.replaceState(null,'', `#id=${id}`); } catch {}
  }
  function idFromHash(){ const m=(location.hash||'').match(/id=([0-9.]+)/); return m ? m[1] : null; }
  function wireStart(){
    const input = document.querySelector('input[placeholder*="starting id" i]') || document.querySelector('input[type="text"]');
    const startBtn = [...document.querySelectorAll('button, .btn')].find(el => /start/i.test(el.textContent||''));
    const go = () => { const v=(input&&input.value||'').trim(); if (ID_RE.test(v)) setAnchor(v); };
    if (startBtn) startBtn.addEventListener('click', go);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }
  function onHash(){ const id=idFromHash(); if (id) setAnchor(id); }

  const API = {
    imageUrl, isDotOne, baseOf,
    getSpouse(id){ return STATE.spouseOf.get(String(id)) || null; },
    getChildrenRoot(id){ const s=String(id); if (STATE.rootOf.has(s)) return STATE.rootOf.get(s); if (isDotOne(s)) return null; return s; },
    async rightSwipeTarget(id){ const s=String(id); if (isDotOne(s)) return baseOf(s); const linked=STATE.spouseOf.get(s); if (linked) return linked; const dotOne=`${s}.1`; return dotOne; },
    forceAnchor: setAnchor,
    debug(){ return { pairs:STATE.pairs.slice(), spouseOf:[...STATE.spouseOf], rootOf:[...STATE.rootOf], anchor:window.__ANCHOR_ID__||null }; }
  };
  if (!window.SwipeSpouse) window.SwipeSpouse = API; else for (const k of Object.keys(API)) if (!(k in window.SwipeSpouse)) window.SwipeSpouse[k]=API[k];

  function boot(){ loadSpouseLink(); wireStart(); onHash(); window.addEventListener('hashchange', onHash); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
