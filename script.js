/* SwipeTree — Swipe Grid Build (fix1, 2025-08-11)
Fixes: center anchor, spouse toggle, back/start, up/down mapping, tap ack.
*/
(() => {
  const CDN = (window.SWIPETREE_CDN_ROOT || "").trim().replace(/\/+$/, '/') + '';
  const stage = document.getElementById('stage');
  const gridA = document.getElementById('gridA');
  const gridB = document.getElementById('gridB');
  const toast = document.getElementById('toast');
  const anchorLabel = document.getElementById('anchorLabel');
  const backBtn = document.getElementById('backBtn');
  const startBtn = document.getElementById('startBtn');
  const parentBtn = document.getElementById('parentBtn');
  const siblingsBtn = document.getElementById('siblingsBtn');
  const childrenBtn = document.getElementById('childrenBtn');
  const spouseBtn = document.getElementById('spouseBtn');

  let activeGrid = gridA;
  let bufferGrid = gridB;
  let anchorId = null;
  let startAnchor = null;
  const historyStack = [];

  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 1400);
  };

  const splitId = (idStr) => {
    const [main, ext] = idStr.split('.', 2);
    return { main, ext: ext || '' };
  };

  const findRightmostNonZeroIndex = (numStr) => {
    for (let i = numStr.length - 1; i >= 0; i--) {
      if (numStr[i] !== '0') return i;
    }
    return -1;
  };

  const computeParent = (idStr) => {
    const { main } = splitId(idStr);
    let s = main;
    const idx = findRightmostNonZeroIndex(s);
    if (idx <= 0) return null;
    s = s.substring(0, idx) + '0' + s.substring(idx + 1);
    s = s.substring(0, idx + 1) + '0'.repeat(s.length - (idx + 1));
    return s;
  };

  const computeChildren = (idStr) => {
    const { main } = splitId(idStr);
    const s = main;
    const idx = findRightmostNonZeroIndex(s);
    const childPos = idx + 1;
    if (childPos >= s.length) return [];
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
    if (idx <= 0) return [];
    const siblings = [];
    const currentDigit = Number(s[idx]);
    for (let d = 1; d <= 9; d++) {
      if (d === currentDigit) continue;
      const sib = s.substring(0, idx) + String(d) + '0'.repeat(s.length - idx - 1);
      siblings.push(sib);
    }
    return siblings;
  };

  const computeSpouseId = async (idStr) => {
    const { main, ext } = splitId(idStr);
    const candidates = ext ? [main] : [`${main}.1`];
    for (const c of candidates) {
      const url = await loadFirstExisting(c);
      if (url) return c;
    }
    return null;
  };

  const EXT_LIST = ['.jpg','.JPG','.jpeg','.JPEG','.png','.PNG'];
  const urlForId = (idCore, ext) => CDN + idCore + ext;

  const loadFirstExisting = (idCore) => {
    return new Promise((resolve) => {
      let done = false;
      const tryOne = (i) => {
        if (done || i >= EXT_LIST.length) return resolve(null);
        const testUrl = urlForId(idCore, EXT_LIST[i]);
        const img = new Image();
        img.onload = () => { done = true; resolve(testUrl); };
        img.onerror = () => tryOne(i + 1);
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

  const setAnchor = async (newAnchor, pushHistory = true, animateDir = 'none') => {
    if (!newAnchor) return;
    if (pushHistory && anchorId) historyStack.push(anchorId);
    anchorId = newAnchor;
    anchorLabel.textContent = `Anchor: ${anchorId}`;
    const url = await loadFirstExisting(anchorId);
    await renderCards(url ? [{ id: anchorId, url }] : [], animateDir);
  };

  const swapGrids = () => {
    activeGrid.classList.remove('active');
    bufferGrid.classList.add('active');
    [activeGrid, bufferGrid] = [bufferGrid, activeGrid];
    bufferGrid.style.transform = 'translate3d(0,0,0)';
    bufferGrid.classList.remove('single');
    bufferGrid.innerHTML = '';
  };

  const renderCards = async (items, direction) => {
    bufferGrid.innerHTML = '';
    bufferGrid.classList.remove('single');

    if (!items || items.length === 0 || !items[0] || !items[0].url) {
      const anchorUrl = await loadFirstExisting(anchorId);
      if (anchorUrl) items = [{ id: anchorId, url: anchorUrl }];
      else items = [];
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

      const acknowledgeTap = () => {
        card.classList.add('tapped');
        setTimeout(() => card.classList.remove('tapped'), 160);
      };
      card.addEventListener('touchstart', acknowledgeTap, { passive:true });
      card.addEventListener('mousedown', acknowledgeTap);
      card.addEventListener('click', () => setAnchor(id));

      bufferGrid.appendChild(card);
    });

    if (items.length === 1) bufferGrid.classList.add('single');

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
    await renderCards(found, 'left');
  };

  const toggleSpouse = async (dirHint = 'right') => {
    const spouseId = await computeSpouseId(anchorId);
    if (!spouseId) {
      showToast('No spouse found');
      await renderCards([], dirHint);
      return;
    }
    const { ext } = splitId(anchorId);
    const goingToSpouse = !ext;
    await setAnchor(spouseId, true, goingToSpouse ? 'right' : 'left');
  };

  parentBtn.addEventListener('click', showParents);
  siblingsBtn.addEventListener('click', showSiblings);
  childrenBtn.addEventListener('click', showChildren);
  spouseBtn.addEventListener('click', () => toggleSpouse('right'));
  backBtn.addEventListener('click', () => {
    const prev = historyStack.pop();
    if (prev) setAnchor(prev, false, 'left');
    else showToast('No history');
  });
  startBtn.addEventListener('click', () => {
    if (startAnchor) setAnchor(startAnchor, true, 'up');
  });

  let touchStartX = 0, touchStartY = 0, tracking = false, swipeLocked = false;
  const THRESH = 32;
  const ANGLE_GUARD = 1.25;

  const onTouchStart = (e) => {
    if (swipeLocked) return;
    const t = e.touches ? e.touches[0] : e;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    tracking = true;
  };
  const onTouchMove = (e) => {
    if (!tracking) return;
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

    if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) return;
    swipeLocked = true;

    try {
      if (Math.abs(dx) > Math.abs(dy) * ANGLE_GUARD) {
        if (dx > 0) await toggleSpouse('right'); else await showSiblings();
      } else if (Math.abs(dy) > Math.abs(dx) * ANGLE_GUARD) {
        if (dy > 0) await showChildren(); else await showParents();
      } else {
        // ambiguous: ignore
      }
    } finally {
      setTimeout(() => { swipeLocked = false; }, 80);
    }
  };

  stage.addEventListener('touchstart', onTouchStart, { passive: false });
  stage.addEventListener('touchmove', onTouchMove, { passive: false });
  stage.addEventListener('touchend', onTouchEnd, { passive: false });
  stage.addEventListener('mousedown', onTouchStart);
  window.addEventListener('mouseup', onTouchEnd);

  ['gesturestart','gesturechange','gestureend'].forEach(evt => {
    window.addEventListener(evt, (e) => e.preventDefault(), { passive:false });
  });

  (async () => {
    let start = window.localStorage.getItem('swipetree_start_id') || '';
    if (!start) start = prompt('Enter starting ID (e.g., 140000):') || '';
    start = (start || '').trim();
    if (!start) start = '100000';
    window.localStorage.setItem('swipetree_start_id', start);
    startAnchor = start;
    await setAnchor(start, false);
  })();
})();