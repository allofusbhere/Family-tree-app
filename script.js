
/* SwipeTree script.js — 2025-08-13 (debug patch)
 * Adds console logging of each attempted image URL and includes PNG fallbacks.
 */
(() => {
  const IMG_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const EXT_CANDIDATES = ['.jpg', '.JPG', '.jpeg', '.JPEG', '.png', '.PNG'];
  const DOUBLE_TAP_MS = 350;

  const el = {
    anchorImg: document.getElementById('anchorImg'),
    anchorFrame: document.getElementById('anchorFrame') || document.body,
    anchorCaption: document.getElementById('anchorCaption'),
    btnStart: document.getElementById('btnStart'),
    btnBack: document.getElementById('btnBack'),
  };

  const state = {
    anchorId: null,
    lastAnchorBeforeSpouse: null,
    history: [],
    touch: { x0: 0, y0: 0, t0: 0 }
  };

  function buildSrc(id, ext) {
    return IMG_BASE + String(id).trim() + ext;
  }

  function resolveImageSrc(id) {
    id = String(id).trim();
    return new Promise((resolve, reject) => {
      let i = 0;
      const tryNext = () => {
        if (i >= EXT_CANDIDATES.length) {
          reject(new Error('No matching extension found for ' + id));
          return;
        }
        const ext = EXT_CANDIDATES[i++];
        const src = buildSrc(id, ext);
        console.log('[SwipeTree] trying:', src);
        const testImg = new Image();
        testImg.onload = () => resolve(src);
        testImg.onerror = tryNext;
        testImg.src = src;
      };
      tryNext();
    });
  }

  function setAnchorHighlight(on) {
    el.anchorFrame?.classList.toggle('anchor-selected', !!on);
  }
  function saveName(id, name) { localStorage.setItem('swipetree:name:' + id, name); }
  function getName(id) { return localStorage.getItem('swipetree:name:' + id) || ''; }
  function renderCaption(id) {
    if (!el.anchorCaption) return;
    const saved = getName(id);
    el.anchorCaption.textContent = saved ? saved : String(id);
  }

  async function showAnchor(id, pushHistory = true) {
    if (!id) return;
    try {
      const src = await resolveImageSrc(id);
      el.anchorImg.src = src;
      state.anchorId = String(id).trim();
      if (pushHistory) state.history.push(state.anchorId);
      setAnchorHighlight(true);
      renderCaption(state.anchorId);
    } catch (err) {
      console.warn('Image not found for', id, err);
      el.anchorImg?.removeAttribute('src');
      state.anchorId = String(id).trim();
      if (pushHistory) state.history.push(state.anchorId);
      setAnchorHighlight(true);
      renderCaption(state.anchorId);
    }
  }

  function goBack() {
    if (state.history.length <= 1) return;
    state.history.pop();
    showAnchor(state.history[state.history.length - 1], false);
  }

  (function wireDoubleTap() {
    let lastTap = 0;
    const handler = () => {
      const now = Date.now();
      if (now - lastTap <= DOUBLE_TAP_MS) {
        const current = state.anchorId || '';
        const existing = getName(current);
        const name = prompt('Set a display name for ' + current, existing || '');
        if (name !== null) {
          saveName(current, name.trim());
          renderCaption(current);
        }
      }
      lastTap = now;
    };
    el.anchorImg?.addEventListener('touchend', handler);
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

  function onTouchStart(e) {
    const t = e.changedTouches[0];
    state.touch = { x0: t.clientX, y0: t.clientY, t0: Date.now() };
  }
  function onTouchEnd(e) {
    const t = e.changedTouches[0];
    const dx = t.clientX - state.touch.x0;
    const dy = t.clientY - state.touch.y0;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    const THRESH = 30;
    if (ax < THRESH && ay < THRESH) return;
    if (ax > ay) {
      if (dx > 0) spouseOrBack();
      else window.SwipeTree?.showSiblings?.(state.anchorId);
    } else {
      if (dy < 0) window.SwipeTree?.showParents?.(state.anchorId);
      else window.SwipeTree?.showChildren?.(state.anchorId);
    }
  }
  function spouseOrBack() {
    if (!state.anchorId) return;
    if (String(state.anchorId).includes('.1')) {
      if (state.lastAnchorBeforeSpouse) showAnchor(state.lastAnchorBeforeSpouse);
      return;
    }
    const spouseId = String(state.anchorId).trim() + '.1';
    state.lastAnchorBeforeSpouse = state.anchorId;
    showAnchor(spouseId);
  }

  el.btnBack?.addEventListener('click', goBack);
  el.btnStart?.addEventListener('click', () => {
    const id = prompt('Enter a starting ID (e.g., 140000):', state.anchorId || '');
    if (id) showAnchor(String(id).trim());
  });

  (function init() {
    el.anchorImg?.addEventListener('touchstart', onTouchStart, { passive: true });
    el.anchorImg?.addEventListener('touchend', onTouchEnd, { passive: true });
    setAnchorHighlight(true);
    let boot = location.hash ? location.hash.slice(1) : (localStorage.getItem('swipetree:lastAnchor') || '');
    if (boot) showAnchor(boot);
    const obs = new MutationObserver(() => {
      if (state.anchorId) localStorage.setItem('swipetree:lastAnchor', state.anchorId);
    });
    if (el.anchorImg) obs.observe(el.anchorImg, { attributes: true, attributeFilter: ['src'] });
  })();
})();
