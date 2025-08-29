
/*
  SwipeTree drop-in patch:
  - Spouse tracing (array-of-two JSON)
  - IMAGE_BASE (images repo)
  - IMG auto-rewrite shim (converts "123456.jpg" -> IMAGE_BASE + "123456.jpg")
  - Anchor auto-loader: reads #id=... on load or Start field, injects <img id="anchorImg">
*/

(function () {
  const IMAGE_BASE = "https://allofusbhere.github.io/family-tree-images/"; // trailing slash
  const ID_RE = /^\d+(?:\.\d+)?$/;
  const ID_FILENAME_RE = /^(\d+(?:\.\d+)?)\.(jpg|JPG|jpeg|JPEG)$/;

  const STATE = {
    loaded: false,
    pairs: [],
    spouseOf: new Map(),
    rootOf: new Map(),
  };

  // ---- SHIM: redirect plain filenames to IMAGE_BASE ----
  (function installImgSrcShim(){
    const origSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
      if (this instanceof HTMLImageElement && name === 'src' && typeof value === 'string') {
        const m = value.match(ID_FILENAME_RE);
        if (m && !value.startsWith('http') && !value.startsWith('data:')) {
          value = IMAGE_BASE + value;
        }
      }
      return origSetAttribute.call(this, name, value);
    };
    const imgProto = HTMLImageElement.prototype;
    const origSrcDescriptor = Object.getOwnPropertyDescriptor(imgProto, 'src');
    if (origSrcDescriptor && origSrcDescriptor.set) {
      Object.defineProperty(imgProto, 'src', {
        configurable: true,
        enumerable: true,
        get: origSrcDescriptor.get,
        set: function(v){
          if (typeof v === 'string') {
            const m = v.match(ID_FILENAME_RE);
            if (m && !v.startsWith('http') && !v.startsWith('data:')) {
              v = IMAGE_BASE + v;
            }
          }
          return origSrcDescriptor.set.call(this, v);
        }
      });
    }
    window.__SwipeTreeImgShim = { IMAGE_BASE, ID_FILENAME_RE };
  })();

  // ---- Spouse link loading ----
  function isDotOne(id) { return typeof id === 'string' && id.endsWith('.1'); }
  function baseOf(id) { return isDotOne(id) ? id.slice(0, -2) : id; }
  function imageUrl(id) { return IMAGE_BASE + `${id}.jpg`; }

  function indexPairs(pairs) {
    STATE.spouseOf.clear();
    STATE.rootOf.clear();
    for (const pair of pairs) {
      if (!Array.isArray(pair) || pair.length !== 2) continue;
      const a = String(pair[0]).trim();
      const b = String(pair[1]).trim();
      if (!a || !b) continue;
      STATE.spouseOf.set(a, b);
      STATE.spouseOf.set(b, a);
      STATE.rootOf.set(a, a);
      STATE.rootOf.set(b, a);
    }
  }

  async function loadSpouseLink() {
    try {
      const res = await fetch('./spouse_link.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('spouse_link.json must be an array of [root, partner] pairs');
      STATE.pairs = data;
      indexPairs(STATE.pairs);
      STATE.loaded = true;
      document.dispatchEvent(new CustomEvent('spouseLinkReady', { detail: { pairs: STATE.pairs } }));
    } catch (err) {
      console.warn('[SwipeSpouse] Failed to load spouse_link.json:', err);
      STATE.loaded = true;
      document.dispatchEvent(new CustomEvent('spouseLinkReady', { detail: { pairs: [], error: String(err) } }));
    }
  }

  // ---- Anchor auto-loader ----
  function findAnchorContainer() {
    // try common containers in your app
    return document.getElementById('anchor')
        || document.querySelector('.anchor')
        || document.querySelector('[data-anchor]')
        || document.querySelector('main')
        || document.body;
  }

  function ensureAnchorImg() {
    let img = document.getElementById('anchorImg');
    if (!img) {
      const container = findAnchorContainer();
      img = document.createElement('img');
      img.id = 'anchorImg';
      img.alt = 'anchor';
      img.style.display = 'block';
      img.style.margin = '20px auto';
      img.style.maxWidth = '90%';
      img.style.borderRadius = '16px';
      container.appendChild(img);
    }
    return img;
  }

  function getIdFromHash() {
    const m = (location.hash || '').match(/id=([0-9.]+)/);
    return m ? m[1] : null;
  }

  function loadAnchorById(id) {
    if (!id || !ID_RE.test(id)) return;
    const img = ensureAnchorImg();
    img.src = `${id}.jpg`; // shim rewrites to IMAGE_BASE
    window.__ANCHOR_ID__ = id;
  }

  function wireStartField() {
    const input = document.querySelector('input[placeholder*="starting ID"], input[placeholder*="Starting ID"]');
    const btn = Array.from(document.querySelectorAll('button, .btn')).find(el => /start/i.test(el.textContent || ''));
    if (!input) return;
    const act = () => {
      const v = (input.value || '').trim();
      if (ID_RE.test(v)) {
        loadAnchorById(v);
        // update URL
        try { history.replaceState(null, '', `#id=${v}`); } catch {}
      }
    };
    if (btn) btn.addEventListener('click', act);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') act(); });
  }

  function onHashChange() {
    const id = getIdFromHash();
    if (id) loadAnchorById(id);
  }

  // ---- Public API ----
  const API = {
    IMAGE_BASE,
    isDotOne,
    baseOf,
    imageUrl,
    getSpouse(id) { return STATE.spouseOf.get(String(id)) || null; },
    getChildrenRoot(id) {
      const s = String(id);
      if (STATE.rootOf.has(s)) return STATE.rootOf.get(s);
      if (isDotOne(s)) return null;
      return s;
    },
    async rightSwipeTarget(id) {
      const s = String(id);
      if (isDotOne(s)) return baseOf(s);
      const linked = STATE.spouseOf.get(s);
      if (linked) return linked;
      const dotOneId = `${s}.1`;
      // optimistic: try load; if it fails, UI can ignore
      return dotOneId;
    },
    debug() {
      return {
        IMAGE_BASE,
        pairs: STATE.pairs.slice(),
        spouseOf: Array.from(STATE.spouseOf.entries()),
        rootOf: Array.from(STATE.rootOf.entries()),
        anchorId: window.__ANCHOR_ID__ || null,
      };
    }
  };

  if (!window.SwipeSpouse) window.SwipeSpouse = API;
  else for (const k of Object.keys(API)) if (!(k in window.SwipeSpouse)) window.SwipeSpouse[k] = API[k];

  function boot() {
    loadSpouseLink();
    wireStartField();
    onHashChange();
    window.addEventListener('hashchange', onHashChange);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
