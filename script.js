
/*
  SwipeTree spouse tracing patch (array-of-two JSON format)
  - Expects ./spouse_link.json to be an array of pairs: [ [root, partner], ... ]
  - First entry in each pair is the ROOT for shared children.
  - `.1` partners have no lineage unless they appear in spouse_link.json.
  - This file is designed to be DROP-IN and NON-BREAKING:
      * It defines a global `SwipeSpouse` namespace with helpers.
      * Your existing code can call these functions, or continue as-is.
      * If your code already had helpers, these won't override unless undefined.
*/

(function () {
  const STATE = {
    loaded: false,
    pairs: [],               // raw pairs: [ [a,b], ... ]
    spouseOf: new Map(),     // id -> spouse
    rootOf: new Map(),       // id -> root (a)
  };

  // --- Utilities ---
  function isDotOne(id) {
    return typeof id === 'string' && id.endsWith('.1');
  }
  function baseOf(id) {
    return isDotOne(id) ? id.slice(0, -2) : id;
  }
  function imageUrl(id) {
    // If your app rewrites image paths, keep using that. This util only builds file name.
    // Many builds use a flat folder of images: `${id}.jpg`
    return `${id}.jpg`;
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

  // Build maps from pairs
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
      STATE.rootOf.set(a, a);  // root is itself
      STATE.rootOf.set(b, a);  // partner's root is a
    }
  }

  // Load JSON (same-origin)
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
      STATE.loaded = true; // still mark loaded so app proceeds
      document.dispatchEvent(new CustomEvent('spouseLinkReady', { detail: { pairs: [] , error: String(err)} }));
    }
  }

  // --- Public API ---
  const API = {
    isDotOne,
    baseOf,
    getSpouse(id) {
      return STATE.spouseOf.get(String(id)) || null;
    },
    getChildrenRoot(id) {
      const s = String(id);
      if (STATE.rootOf.has(s)) return STATE.rootOf.get(s);
      if (isDotOne(s)) return null; // display-only (no lineage) when not in JSON
      return s;
    },
    async rightSwipeTarget(id) {
      const s = String(id);
      if (isDotOne(s)) return baseOf(s);
      const linked = STATE.spouseOf.get(s);
      if (linked) return linked;
      const dotOneId = `${s}.1`;
      if (await imageExists(dotOneId)) return dotOneId;
      return null;
    },
    async filterToExistingImages(ids) {
      const checks = await Promise.all(ids.map(id => imageExists(id)));
      return ids.filter((id, i) => checks[i]);
    },
    debug() {
      return {
        loaded: STATE.loaded,
        pairs: STATE.pairs.slice(),
        spouseOf: Array.from(STATE.spouseOf.entries()),
        rootOf: Array.from(STATE.rootOf.entries()),
      };
    }
  };

  if (!window.SwipeSpouse) {
    window.SwipeSpouse = API;
  } else {
    for (const k of Object.keys(API)) {
      if (!(k in window.SwipeSpouse)) {
        window.SwipeSpouse[k] = API[k];
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSpouseLink);
  } else {
    loadSpouseLink();
  }
})();
