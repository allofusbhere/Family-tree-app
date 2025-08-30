// SwipeTree core — minimal, clutter-free, iPad-friendly swipes with history and grid overlays.
// Images expected at /family-tree-images/<id>.jpg . No blanks: tiles hide on load error.

(() => {
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => [...el.querySelectorAll(s)];
  const $anchor = qs('#anchorImg');
  const $label = qs('#anchorLabel');
  const $gridOverlay = qs('#gridOverlay');
  const $grid = qs('#grid');
  const $gridTitle = qs('#gridTitle');
  const $closeGrid = qs('#closeGrid');
  const $backBtn = qs('#backBtn');
  const $status = qs('#status');
  const $stage = qs('#stage');

  // Prevent page scroll on iOS while we manage gestures
  const stopScroll = (e) => { e.preventDefault(); };
  ['touchmove','wheel'].forEach(evt => document.addEventListener(evt, stopScroll, {passive:false}));

  // ---- State ----
  const historyStack = [];
  let anchorId = null;
  const IMAGES_BASE = '/family-tree-images';

  // ---- Helpers ----
  const imgSrcFor = (id) => `${IMAGES_BASE}/${id}.jpg`;

  const setStatus = (msg) => { if ($status) $status.textContent = msg; };

  const setAnchor = (id, pushHistory=true) => {
    if (!id) return;
    if (pushHistory && anchorId) historyStack.push(anchorId);
    anchorId = id.toString();
    $anchor.src = imgSrcFor(anchorId);
    $anchor.alt = anchorId;
    $label.textContent = anchorId;
    $backBtn.disabled = historyStack.length === 0;
    hideGrid();
    // Update URL without page reload
    try {
      const url = new URL(window.location);
      url.hash = `id=${anchorId}`;
      history.replaceState(null, '', url);
    } catch {}
  };

  const getIdFromHash = () => {
    const h = (window.location.hash||'').replace(/^#/, '');
    // support id=XXXX or just XXXXX
    if (h.startsWith('id=')) return h.slice(3);
    return h || '';
  };

  const showGrid = (title, ids) => {
    $gridTitle.textContent = title;
    $grid.innerHTML = '';
    // Create tiles; auto-hide when image fails (no blanks)
    ids.forEach(id => {
      const tile = document.createElement('div');
      tile.className = 'tile fade-in';
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = id;
      img.src = imgSrcFor(id);
      img.onerror = () => { tile.style.display = 'none'; };
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.textContent = id;
      tile.appendChild(img);
      tile.appendChild(tag);
      tile.addEventListener('click', () => {
        setAnchor(id, true);
      }, {passive:true});
      $grid.appendChild(tile);
    });
    $gridOverlay.classList.remove('hidden');
  };

  const hideGrid = () => {
    if (!$gridOverlay.classList.contains('hidden')) {
      $gridOverlay.classList.add('hidden');
      $grid.innerHTML = '';
    }
  };

  $closeGrid.addEventListener('click', hideGrid);

  // ---- Relationship math (per user rules) ----
  // Children: parent + k*1000 (k=1..9). Grandchildren: +k*100, etc.
  // Siblings: same parent → vary the thousands place while preserving digits.
  // We avoid blanks visually by hiding images that 404.
  const toInt = (x) => parseInt(x, 10);

  const childrenOf = (id) => {
    const n = toInt(id);
    const base = Math.floor(n / 1000) * 1000; // zero out lower 3 digits
    // children slots 1..9 (1000, 2000, ..., 9000)
    return Array.from({length:9}, (_,i) => base + (i+1)*1000);
  };

  const siblingsOf = (id) => {
    const n = toInt(id);
    // Siblings share same parent → zero out lower 4 digits of parent tier? For 6-digit ids, vary the thousands place.
    const base = Math.floor(n / 10000) * 10000; // parent block (e.g., 100000 -> base 100000; siblings: 110000,120000,... ) 
    return Array.from({length:9}, (_,i) => base + (i+1)*10000);
  };

  const parentsOf = (id) => {
    const n = toInt(id);
    // Parent is the block with thousands digit set to 0
    const parent = Math.floor(n / 10000) * 10000;
    // Represent as [Parent1, Parent2 placeholder via spouse .1 pattern not yet resolved]
    // For now, surface a single parent anchor plus the spouse anchor using .1 suffix if user has file
    const p1 = parent;
    return [p1];
  };

  const spouseOf = (id) => {
    // Use ".1" suffix convention; toggle if already has .1
    const s = String(id);
    if (s.includes('.1')) return [s.replace('.1','')];
    return [`${s}.1`];
  };

  // ---- Gestures ----
  let touchStartX=0, touchStartY=0, touchActive=false;
  const THRESHOLD = 30; // px swipe threshold tuned for iPad

  const onTouchStart = (e) => {
    const t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchActive = true;
  };

  const onTouchEnd = (e) => {
    if (!touchActive) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    touchActive = false;

    if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return; // tap

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal
      if (dx > 0) {
        // → spouse
        const ids = spouseOf(anchorId);
        showGrid('Spouse', ids);
      } else {
        // ← siblings
        const ids = siblingsOf(anchorId);
        showGrid('Siblings', ids);
      }
    } else {
      // Vertical
      if (dy < 0) {
        // ↑ parents
        const ids = parentsOf(anchorId);
        showGrid('Parents', ids);
      } else {
        // ↓ children
        const ids = childrenOf(anchorId);
        showGrid('Children', ids);
      }
    }
  };

  // Attach to stage so whole center listens; disable page scroll via CSS + preventDefault already set
  $stage.addEventListener('touchstart', onTouchStart, {passive:true});
  $stage.addEventListener('touchend', onTouchEnd, {passive:true});

  // Also support keyboard for desktop tests
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') showGrid('Parents', parentsOf(anchorId));
    if (e.key === 'ArrowDown') showGrid('Children', childrenOf(anchorId));
    if (e.key === 'ArrowLeft') showGrid('Siblings', siblingsOf(anchorId));
    if (e.key === 'ArrowRight') showGrid('Spouse', spouseOf(anchorId));
  });

  // Back handling
  $backBtn.addEventListener('click', () => {
    if (!$backBtn.disabled) {
      const prev = historyStack.pop();
      setAnchor(prev, false);
      $backBtn.disabled = historyStack.length === 0;
    }
  });

  // Hide anchor behind grid
  const mo = new MutationObserver(() => {
    const hidden = !$gridOverlay.classList.contains('hidden');
    qs('#anchorWrap').style.visibility = hidden ? 'hidden' : 'visible';
  });
  mo.observe($gridOverlay, {attributes:true, attributeFilter:['class']});

  // Clicking a grid tile navigates; we already setAnchor on click handler

  // Initialize
  const initId = getIdFromHash() || '100000';
  setAnchor(initId, false);
  setStatus('Swipe ↑ parents · ↓ children · ← siblings · → spouse');
})();
