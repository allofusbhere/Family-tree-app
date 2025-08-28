
/*
  SwipeTree spouse tracing patch + image base config
  - Reads ./spouse_link.json as [ [root, partner], ... ]
  - First in pair is ROOT for shared children
  - Adds IMAGE_BASE so images load from your images repo (flat files)
*/

(function () {
  // >>>>>>> EDIT THIS IF NEEDED <<<<<<<<
  // Default to your GitHub Pages images repo (flat files, no subfolders)
  const IMAGE_BASE = "https://allofusbhere.github.io/family-tree-images/"; // ends with /
  // Alternative (jsDelivr): "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/"
  // >>>>>>> ---------------------- <<<<<<<<

  const STATE = {
    loaded: false,
    pairs: [],
    spouseOf: new Map(),
    rootOf: new Map(),
  };

  function isDotOne(id) { return typeof id === 'string' && id.endsWith('.1'); }
  function baseOf(id) { return isDotOne(id) ? id.slice(0, -2) : id; }

  function imageUrl(id) {
    return IMAGE_BASE + `${id}.jpg`;
  }
  function imageExists(id) {
    return new Promise((resolve) => {
      const url = imageUrl(id);
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

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

  const API = {
    IMAGE_BASE,
    isDotOne,
    baseOf,
    imageUrl,
    async rightSwipeTarget(id) {
      const s = String(id);
      if (isDotOne(s)) return baseOf(s);
      const linked = STATE.spouseOf.get(s);
      if (linked) return linked;
      const dotOneId = `${s}.1`;
      if (await imageExists(dotOneId)) return dotOneId;
      return null;
    },
    getSpouse(id) { return STATE.spouseOf.get(String(id)) || null; },
    getChildrenRoot(id) {
      const s = String(id);
      if (STATE.rootOf.has(s)) return STATE.rootOf.get(s);
      if (isDotOne(s)) return null;
      return s;
    },
    async filterToExistingImages(ids) {
      const checks = await Promise.all(ids.map(id => imageExists(id)));
      return ids.filter((id, i) => checks[i]);
    },
    debug() {
      return {
        IMAGE_BASE,
        pairs: STATE.pairs.slice(),
        spouseOf: Array.from(STATE.spouseOf.entries()),
        rootOf: Array.from(STATE.rootOf.entries()),
      };
    }
  };

  if (!window.SwipeSpouse) window.SwipeSpouse = API;
  else for (const k of Object.keys(API)) if (!(k in window.SwipeSpouse)) window.SwipeSpouse[k] = API[k];

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadSpouseLink);
  else loadSpouseLink();
})();
