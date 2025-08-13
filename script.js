
/* SwipeTree script.js — 2025-08-13
 * Focus: fix 404s by using the correct GitHub images path + case-insensitive extensions,
 * keep anchor highlight ON, enable double‑tap to set/display name, and enable spouse-back on swipe→.
 *
 * This file does NOT change your relationship math. It only touches image loading + UI wiring.
 * If your existing HTML had different element IDs, update the selectors near the top.
 */

(() => {
  // ---------- CONFIG ----------
  // Point to your image repo (flat folder with files like 140000.jpg, 140000.1.jpg, etc.)
  const IMG_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  // Allowed extensions we will try in order:
  const EXT_CANDIDATES = ['.jpg', '.JPG', '.jpeg', '.JPEG'];
  // How long between taps to count as a "double-tap" (ms)
  const DOUBLE_TAP_MS = 350;

  // Element IDs used by index.html
  const el = {
    anchorImg: document.getElementById('anchorImg'),
    anchorFrame: document.getElementById('anchorFrame') || document.body, // frame div for highlight
    anchorCaption: document.getElementById('anchorCaption'),
    btnStart: document.getElementById('btnStart'),
    btnBack: document.getElementById('btnBack'),
  };

  // In-memory navigation state
  const state = {
    anchorId: null,               // current numeric/string id e.g., "140000" or "140000.1"
    lastAnchorBeforeSpouse: null, // used for spouse-back
    history: [],                  // back stack of ids
    touch: { x0: 0, y0: 0, t0: 0 }
  };

  // ---------- UTILITIES ----------
  function buildSrc(id, ext) {
    return IMG_BASE + String(id) + ext;
  }

  // Attempts loading the first extension that exists. Returns a Promise that resolves
  // to the actual src assigned, or rejects if none worked.
  function resolveImageSrc(id) {
    return new Promise((resolve, reject) => {
      let i = 0;
      const tryNext = () => {
        if (i >= EXT_CANDIDATES.length) {
          reject(new Error('No matching extension found for ' + id));
          return;
        }
        const src = buildSrc(id, EXT_CANDIDATES[i++]);
        const testImg = new Image();
        testImg.onload = () => resolve(src);
        testImg.onerror = tryNext;
        testImg.src = src;
      };
      tryNext();
    });
  }

  function setAnchorHighlight(on) {
    // Maintain a persistent glow on the anchor frame
    if (!el.anchorFrame) return;
    el.anchorFrame.classList.toggle('anchor-selected', !!on);
  }

  function saveName(id, name) {
    localStorage.setItem('swipetree:name:' + id, name);
  }
  function getName(id) {
    return localStorage.getItem('swipetree:name:' + id) || '';
  }
  function renderCaption(id) {
    if (!el.anchorCaption) return;
    const saved = getName(id);
    el.anchorCaption.textContent = saved ? saved : String(id);
  }

  // ---------- IMAGE LOADING ----------
  async function showAnchor(id, pushHistory = true) {
    if (!id) return;
    try {
      const src = await resolveImageSrc(id);
      el.anchorImg.src = src;
      state.anchorId = String(id);
      if (pushHistory) state.history.push(state.anchorId);
      setAnchorHighlight(true);
      renderCaption(state.anchorId);
    } catch (err) {
      console.warn('Image not found for', id, err);
      // Keep the caption as the id so user knows what was attempted
      if (el.anchorImg) el.anchorImg.removeAttribute('src');
      state.anchorId = String(id);
      if (pushHistory) state.history.push(state.anchorId);
      setAnchorHighlight(true);
      renderCaption(state.anchorId);
    }
  }

  function goBack() {
    if (state.history.length <= 1) return;
    // Pop current
    state.history.pop();
    const prev = state.history[state.history.length - 1];
    showAnchor(prev, /*pushHistory*/ false);
  }

  // ---------- DOUBLE‑TAP NAME EDIT ----------
  (function wireDoubleTap() {
    let lastTap = 0;
    el.anchorImg?.addEventListener('touchend', () => {
      const now = Date.now();
      if (now - lastTap <= DOUBLE_TAP_MS) {
        // double tap detected
        const current = state.anchorId || '';
        const existing = getName(current);
        const name = prompt('Set a display name for ' + current, existing || '');
        if (name !== null) {
          saveName(current, name.trim());
          renderCaption(current);
        }
      }
      lastTap = now;
    });

    // Also support desktop double-click
    el.anchorImg?.addEventListener('dblclick', () => {
      const current = state.anchorId || '';
      const existing = getName(current);
      const name = prompt('Set a display name for ' + current, existing || '');
      if (name !== null) {
        saveName(current, name.trim());
        renderCaption(current);
      }
    });
  })();

  // ---------- SWIPE WIRING ----------
  // Right: spouse/back to spouse
  // Up: parents (handed off to existing logic if present)
  // Down: children (handed off)
  // Left: siblings (handed off)
  function onTouchStart(e) {
    const t = e.changedTouches[0];
    state.touch = { x0: t.clientX, y0: t.clientY, t0: Date.now() };
  }
  function onTouchEnd(e) {
    const t = e.changedTouches[0];
    const dx = t.clientX - state.touch.x0;
    const dy = t.clientY - state.touch.y0;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    const THRESH = 30; // px

    if (ax < THRESH && ay < THRESH) return; // tap, handled elsewhere

    if (ax > ay) {
      // horizontal
      if (dx > 0) {
        // → spouse/back
        spouseOrBack();
      } else {
        // ← siblings (delegate if your app exposes a handler)
        window.SwipeTree?.showSiblings?.(state.anchorId);
      }
    } else {
      // vertical
      if (dy < 0) {
        // ↑ parents
        window.SwipeTree?.showParents?.(state.anchorId);
      } else {
        // ↓ children
        window.SwipeTree?.showChildren?.(state.anchorId);
      }
    }
  }

  function spouseOrBack() {
    if (!state.anchorId) return;
    // If currently looking at a ".1" spouse file, go back to prior anchor
    if (String(state.anchorId).includes('.1')) {
      if (state.lastAnchorBeforeSpouse) {
        showAnchor(state.lastAnchorBeforeSpouse);
      }
      return;
    }
    // Else try spouse = "<id>.1"
    const spouseId = String(state.anchorId) + '.1';
    state.lastAnchorBeforeSpouse = state.anchorId;
    showAnchor(spouseId);
  }

  // ---------- BUTTONS ----------
  el.btnBack?.addEventListener('click', goBack);
  el.btnStart?.addEventListener('click', () => {
    const id = prompt('Enter a starting ID (e.g., 140000):', state.anchorId || '');
    if (id) showAnchor(String(id).trim());
  });

  // ---------- INIT ----------
  // If page loads with a hash like #140000, use it; else use any saved last anchor; else wait for START.
  (function init() {
    el.anchorImg?.addEventListener('touchstart', onTouchStart, { passive: true });
    el.anchorImg?.addEventListener('touchend', onTouchEnd, { passive: true });
    // persistent highlight on load
    setAnchorHighlight(true);

    let boot = location.hash ? location.hash.slice(1) : (localStorage.getItem('swipetree:lastAnchor') || '');
    if (boot) showAnchor(boot);
    // Save last anchor on each change
    const obs = new MutationObserver(() => {
      if (state.anchorId) localStorage.setItem('swipetree:lastAnchor', state.anchorId);
    });
    if (el.anchorImg) obs.observe(el.anchorImg, { attributes: true, attributeFilter: ['src'] });
  })();

})();
