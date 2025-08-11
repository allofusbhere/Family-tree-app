/* SwipeTree — Swipe Grid Build (2025-08-11)
   - Smooth roll-in/out for horizontal (siblings/spouse) and vertical (parents/children)
   - Reliable single-swipe gesture handling (locked per swipe)
   - Dynamic ID math per user's rules (fixed-length, generation-by-digit)
   - No blanks: we hide empty slots; show a toast when none found
*/

(() => {
  const CDN = (window.SWIPETREE_CDN_ROOT || "").trim().replace(/\/+$/, '/') + '';
  const stage = document.getElementById('stage');
  const gridA = document.getElementById('gridA');
  const gridB = document.getElementById('gridB');
  const toast = document.getElementById('toast');
  const anchorLabel = document.getElementById('anchorLabel');
  const backBtn = document.getElementById('backBtn');
  const parentBtn = document.getElementById('parentBtn');
  const siblingsBtn = document.getElementById('siblingsBtn');
  const childrenBtn = document.getElementById('childrenBtn');
  const spouseBtn = document.getElementById('spouseBtn');

  let activeGrid = gridA;
  let bufferGrid = gridB;
  let anchorId = null;
  const historyStack = [];

  // === Utilities ===
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 1400);
  };

  const padLike = (numStr, likeStr) => numStr.padStart(likeStr.length, '0');

  const splitId = (idStr) => {
    // Support spouse extension like "140000.1" (partner image id)
    const [main, ext] = idStr.split('.', 2);
    return { main, ext: ext || '' };
  };

  const joinId = (main, ext) => ext ? `${main}.${ext}` : main;

  const findRightmostNonZeroIndex = (numStr) => {
    for (let i = numStr.length - 1; i >= 0; i--) {
      if (numStr[i] !== '0') return i;
    }
    return -1; // root-like (all zeros) — rare for our use
  };

  const computeParent = (idStr) => {
    const { main } = splitId(idStr);
    let s = main;
    const idx = findRightmostNonZeroIndex(s);
    if (idx <= 0) return null; // no parent known
    s = s.substring(0, idx) + '0' + s.substring(idx + 1);
    // If there are any non-zero digits to the right, zero them (keep generation boundary clean)
    s = s.substring(0, idx + 1) + '0'.repeat(s.length - (idx + 1));
    return s;
  };

  const computeChildren = (idStr) => {
    const { main } = splitId(idStr);
    const s = main;
    const idx = findRightmostNonZeroIndex(s);
    let childPos = idx + 1;
    if (childPos >= s.length) return []; // cannot go deeper
    const arr = [];
    for (let d = 1; d <= 9; d++) {
      const child = s.substring(0, childPos) + String(d) + '0'.repeat(s.length - childPos - 1);
      arr.push(child);
    }
    return arr;
  };

  const computeSiblings = (idStr) => {
    const { main } = splitId(idStr);
    const s = main;
    const idx = findRightmostNonZeroIndex(s);
    if (idx <= 0) return []; // no siblings if top-most
    const siblings = [];
    const currentDigit = Number(s[idx]);
    for (let d = 1; d <= 9; d++) {
      if (d === currentDigit) continue;
      const sib = s.substring(0, idx) + String(d) + '0'.repeat(s.length - idx - 1);
      siblings.push(sib);
    }
    return siblings;
  };

  const computeSpouses = (idStr) => {
    // Minimal rule set consistent with prior tests:
    // - If anchor is "140000", preferred partner is "140000.1" (if exists).
    // - If anchor is "140000.1", partner anchor is "140000" (base).
    // - Additionally, try the reverse-link style "<other>.1.<anchorMain>" if present — future-facing.
    const { main, ext } = splitId(idStr);
    const candidates = [];
    if (!ext) {
      candidates.push(`${main}.1`);
    } else {
      candidates.push(main);
    }
    // Extended guess: try to discover reciprocal numbered partner by scanning known images later.
    return candidates;
  };

  // Image helper that resolves first existing variant (jpg/JPG/JPEG/jpeg/png/PNG)
  const EXT_LIST = ['.jpg','.JPG','.jpeg','.JPEG','.png','.PNG'];
  const urlForId = (idCore, ext) => CDN + idCore + ext;

  const loadFirstExisting = (idCore) => {
    return new Promise((resolve) => {
      let done = false;
      let chosenUrl = null;

      const tryOne = (i) => {
        if (done || i >= EXT_LIST.length) return resolve(null);
        const testUrl = urlForId(idCore, EXT_LIST[i]);
        const img = new Image();
        img.onload = () => { done = true; chosenUrl = testUrl; resolve(chosenUrl); };
        img.onerror = () => tryOne(i + 1);
        // Avoid interfering with gestures
        img.decoding = 'async';
        img.src = testUrl;
      };
      tryOne(0);
    });
  };

  const loadManyExisting = async (ids) => {
    const out = [];
    for (const id of ids) {
      const url = await loadFirstExisting(id);
      if (url) out.push({ id, url });
    }
    return out;
  };

  const setAnchor = async (newAnchor, pushHistory = true) => {
    if (!newAnchor) return;
    if (pushHistory && anchorId) historyStack.push(anchorId);
    anchorId = newAnchor;
    anchorLabel.textContent = `Anchor: ${anchorId}`;
    // Render the anchor card grid (just the single anchor centered) initially
    await renderCards([{ id: anchorId, url: await loadFirstExisting(anchorId) }], 'none');
  };

  const swapGrids = () => {
    activeGrid.classList.remove('active');
    bufferGrid.classList.add('active');
    [activeGrid, bufferGrid] = [bufferGrid, activeGrid];
    // Reset old buffer position
    bufferGrid.style.transform = 'translate3d(0,0,0)';
    bufferGrid.innerHTML = '';
  };

  const renderCards = async (items, direction) => {
    // Build content in bufferGrid, then animate in
    bufferGrid.innerHTML = '';
    if (!items || items.length === 0 || !items[0] || !items[0].url) {
      // show only the current anchor if available
      const anchorUrl = await loadFirstExisting(anchorId);
      if (anchorUrl) {
        items = [{ id: anchorId, url: anchorUrl }];
      } else {
        items = [];
      }
    }

    items.forEach(({ id, url }) => {
      const card = document.createElement('div');
      card.className = 'card';
      const img = document.createElement('img');
      img.src = url;
      img.alt = id;
      img.draggable = false;
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.textContent = id;
      card.appendChild(img);
      card.appendChild(tag);
      // Tap to set as new anchor
      card.addEventListener('click', () => setAnchor(id));
      bufferGrid.appendChild(card);
    });

    // Fill to 3x3 visually by stretching cards with CSS grid if fewer — no explicit blanks added.
    // Animate
    const w = stage.clientWidth;
    const h = stage.clientHeight;

    const dir = direction || 'none';
    let from = 'translate3d(0,0,0)';
    let to = 'translate3d(0,0,0)';
    if (dir === 'left')  { from = `translate3d(${w}px,0,0)`; to = `translate3d(-${w}px,0,0)`; }
    if (dir === 'right') { from = `translate3d(-${w}px,0,0)`; to = `translate3d(${w}px,0,0)`; }
    if (dir === 'up')    { from = `translate3d(0,${h}px,0)`; to = `translate3d(0,-${h}px,0)`; }
    if (dir === 'down')  { from = `translate3d(0,-${h}px,0)`; to = `translate3d(0,${h}px,0)`; }

    bufferGrid.style.transform = from;
    bufferGrid.classList.add('active');
    activeGrid.classList.remove('active');

    // Force layout then animate
    bufferGrid.getBoundingClientRect();
    bufferGrid.style.transform = 'translate3d(0,0,0)';
    activeGrid.style.transform = to;

    return new Promise((resolve) => {
      const onEnd = () => {
        activeGrid.removeEventListener('transitionend', onEnd);
        swapGrids();
        resolve();
      };
      activeGrid.addEventListener('transitionend', onEnd, { once: true });
    });
  };

  // === Navigation actions ===
  const showChildren = async () => {
    const kids = computeChildren(anchorId);
    const found = await loadManyExisting(kids);
    if (found.length === 0) showToast('No children found');
    await renderCards(found, 'down');
  };

  const showParents = async () => {
    const p = computeParent(anchorId);
    const arr = p ? [p] : [];
    const found = await loadManyExisting(arr);
    if (found.length === 0) showToast('No parent found');
    await renderCards(found, 'up');
  };

  const showSiblings = async () => {
    const sibs = computeSiblings(anchorId);
    const found = await loadManyExisting(sibs);
    if (found.length === 0) showToast('No siblings found');
    await renderCards(found, 'left'); // horizontal swap
  };

  const showSpouse = async () => {
    const cands = computeSpouses(anchorId);
    // Try primary candidates first
    let found = await loadManyExisting(cands);
    // If none, try heuristic: scan for "<X>.1.<anchorMain>" by sampling same generation prefixes (lightweight)
    if (found.length === 0) {
      const { main } = splitId(anchorId);
      // Try scanning a small set of likely partner ids (same generation bucket)
      const idx = findRightmostNonZeroIndex(main);
      const bucketPrefix = main.substring(0, idx) || '';
      const guess = [];
      for (let d = 1; d <= 9; d++) {
        const maybe = bucketPrefix + String(d) + '0'.repeat(main.length - idx - 1);
        if (maybe !== main) guess.push(`${maybe}.1.${main}`);
      }
      found = await loadManyExisting(guess);
    }
    if (found.length === 0) showToast('No spouse found');
    await renderCards(found, 'right');
  };

  // Buttons
  parentBtn.addEventListener('click', showParents);
  siblingsBtn.addEventListener('click', showSiblings);
  childrenBtn.addEventListener('click', showChildren);
  spouseBtn.addEventListener('click', showSpouse);
  backBtn.addEventListener('click', () => {
    const prev = historyStack.pop();
    if (prev) setAnchor(prev, false);
    else showToast('No history');
  });

  // === Gesture handling ===
  let touchStartX = 0, touchStartY = 0, tracking = false, swipeLocked = false;
  const THRESH = 32; // pixels

  const onTouchStart = (e) => {
    if (swipeLocked) return;
    const t = e.touches ? e.touches[0] : e;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    tracking = true;
  };
  const onTouchMove = (e) => {
    if (!tracking) return;
    // prevent native scroll/zoom
    if (e.cancelable) e.preventDefault();
  };
  const onTouchEnd = async (e) => {
    if (!tracking || swipeLocked) return;
    tracking = false;
    const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    const endX = t ? t.clientX : (e.clientX || touchStartX);
    const endY = t ? t.clientY : (e.clientY || touchStartY);
    const dx = endX - touchStartX;
    const dy = endY - touchStartY;

    if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) return; // ignore small moves
    swipeLocked = true; // ensure single action per swipe

    try {
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        if (dx > 0) await showSpouse(); else await showSiblings();
      } else {
        // Vertical
        if (dy > 0) await showParents(); else await showChildren();
      }
    } finally {
      setTimeout(() => { swipeLocked = false; }, 80);
    }
  };

  stage.addEventListener('touchstart', onTouchStart, { passive: false });
  stage.addEventListener('touchmove', onTouchMove, { passive: false });
  stage.addEventListener('touchend', onTouchEnd, { passive: false });
  // Also support mouse for desktop testing
  stage.addEventListener('mousedown', onTouchStart);
  window.addEventListener('mouseup', onTouchEnd);

  // Prevent gestures outside stage too
  ['gesturestart','gesturechange','gestureend'].forEach(evt => {
    window.addEventListener(evt, (e) => e.preventDefault(), { passive:false });
  });

  // === Init ===
  (async () => {
    let start = window.localStorage.getItem('swipetree_start_id') || '';
    if (!start) {
      start = prompt('Enter starting ID (e.g., 140000):') || '';
    }
    start = (start || '').trim();
    if (!start) start = '100000'; // fallback
    window.localStorage.setItem('swipetree_start_id', start);
    await setAnchor(start, false);
  })();

})();