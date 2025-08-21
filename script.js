
// SwipeTree — fixed image base + grid suppression + SoftEdit (long-press) + swipe nav
(function () {
  'use strict';

  // ====== CONFIG ======
  // Base where your JPG images are hosted (GitHub Pages for the images repo)
  const IMAGES_BASE = 'https://allofusbhere.github.io/family-tree-images/'; // <-- fixed
  const IMAGE_EXT = '.jpg';

  // Optional Netlify endpoints for label persistence across devices.
  // Set LABELS_GET_URL to something like: 'https://<yoursite>.netlify.app/.netlify/functions/getLabel?id='
  // Set LABELS_SET_URL for POST { id, name }
  const LABELS_GET_URL = ''; // leave blank to disable remote fetch
  const LABELS_SET_URL = '';

  // ====== STATE ======
  const state = {
    anchorId: null,
    history: [],
    longPressTimer: null,
    longPressMs: 520,
    namesCache: {}, // in-memory label cache
  };

  // ====== HELPERS ======
  const $ = (sel) => document.querySelector(sel);

  function idFromURL() {
    const m = location.hash.match(/id=([0-9.]+)/);
    if (m) return m[1];
    // also support index.html?id=...
    const q = new URLSearchParams(location.search);
    if (q.get('id')) return q.get('id');
    return null;
  }

  function pushHistory(id) {
    if (state.anchorId) state.history.push(state.anchorId);
    try {
      history.replaceState({}, '', `#id=${id}`);
    } catch {}
  }

  function imageURL(id) {
    return IMAGES_BASE + id + IMAGE_EXT;
  }

  function trailingZerosCount(idNumber) {
    let n = idNumber;
    let count = 0;
    while (n % 10 === 0 && n !== 0) { n = Math.floor(n / 10); count++; }
    return count;
  }

  function magnitudeForChildren(idNumber) {
    // Children modify the next lower digit place than the trailing zeros.
    // Example: 100000 (5 zeros) -> step 10^(5-1) = 10000 => 110000..190000
    //          140000 (4 zeros) -> step 10^(4-1) = 1000  => 141000..149000
    const tz = trailingZerosCount(idNumber);
    const magExp = Math.max(0, tz - 1);
    return Math.pow(10, magExp);
  }

  function parentOf(idNumber) {
    // Parent is id with current magnitude digit set to 0.
    const mag = magnitudeForChildren(idNumber);
    // compute digit at this magnitude:
    const digit = Math.floor(idNumber / mag) % 10;
    if (digit === 0) return null; // already at top branch (no parent known)
    const parent = idNumber - digit * mag;
    return parent;
  }

  function siblingsOf(idNumber) {
    const mag = magnitudeForChildren(idNumber);
    const parent = parentOf(idNumber);
    if (parent === null) return [];
    const sibs = [];
    for (let d = 1; d <= 9; d++) {
      const candidate = parent + d * mag;
      if (candidate !== idNumber) sibs.push(candidate);
    }
    return sibs;
  }

  function childrenOf(idNumber) {
    const mag = magnitudeForChildren(idNumber);
    const kids = [];
    for (let d = 1; d <= 9; d++) {
      kids.push(idNumber + d * mag);
    }
    return kids;
  }

  function toInt(id) {
    // Strip spouse suffix .1 for numeric operations
    return parseInt(String(id).split('.')[0], 10);
  }

  function isSpouseId(id) {
    return String(id).includes('.1');
  }

  function spouseOf(id) {
    // Toggle .1 suffix; each partner owns their own .1 file
    const s = String(id);
    if (isSpouseId(s)) {
      return s.replace('.1', '');
    } else {
      return s + '.1';
    }
  }

  async function fetchLabelRemote(id) {
    if (!LABELS_GET_URL) return null;
    try {
      const r = await fetch(LABELS_GET_URL + encodeURIComponent(id), { cache: 'no-store' });
      if (!r.ok) return null;
      const data = await r.json();
      return (data && (data.name || data.label)) || null;
    } catch { return null; }
  }

  async function saveLabelRemote(id, name) {
    if (!LABELS_SET_URL) return false;
    try {
      const r = await fetch(LABELS_SET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name })
      });
      return r.ok;
    } catch { return false; }
  }

  function setLabel(id, name) {
    state.namesCache[id] = name;
    $('#anchorLabel').textContent = name || '';
  }

  async function loadLabel(id) {
    if (state.namesCache[id]) {
      $('#anchorLabel').textContent = state.namesCache[id];
      return;
    }
    const name = await fetchLabelRemote(id);
    if (name) {
      state.namesCache[id] = name;
      $('#anchorLabel').textContent = name;
    } else {
      $('#anchorLabel').textContent = ''; // no fallback to localStorage to avoid device-only persistence
    }
  }

  function clearGrid() {
    $('#grid').innerHTML = '';
  }

  function showOverlay(title) {
    $('#overlayTitle').textContent = title;
    $('#gridOverlay').classList.remove('hidden');
  }
  function hideOverlay() {
    $('#gridOverlay').classList.add('hidden');
  }

  function renderTile(container, id) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.id = id;
    tile.innerHTML = `
      <div class="tid">${id}</div>
      <img alt="person" />
      <div class="name"></div>
    `;
    const img = tile.querySelector('img');
    img.src = imageURL(id);
    img.addEventListener('error', () => {
      // Suppress unused IDs: hide tile if image missing
      tile.remove();
    }, { once: true });
    // optional: attempt label fetch (non-blocking)
    if (LABELS_GET_URL) {
      fetchLabelRemote(id).then((nm) => {
        if (nm) tile.querySelector('.name').textContent = nm;
      });
    }

    tile.addEventListener('click', () => {
      navigateTo(id);
      hideOverlay();
    });
    container.appendChild(tile);
  }

  function renderGrid(title, ids) {
    clearGrid();
    showOverlay(title);
    const grid = $('#grid');
    ids.forEach((id) => renderTile(grid, id));
  }

  async function loadAnchor(id) {
    state.anchorId = String(id);
    $('#anchorCard').classList.add('focus');
    $('#anchorId').textContent = state.anchorId;
    $('#anchorImg').src = imageURL(state.anchorId);
    $('#anchorImg').onerror = () => {
      // keep card but image won't show; id + label still present
    };
    await loadLabel(state.anchorId);
  }

  function navigateTo(id) {
    pushHistory(String(id));
    loadAnchor(String(id));
  }

  // ====== SWIPE HANDLERS ======
  function attachSwipe(el) {
    let x0 = 0, y0 = 0, active = false;
    const threshold = 30;

    el.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      x0 = t.clientX; y0 = t.clientY; active = true;
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {}, { passive: true });

    el.addEventListener('touchend', (e) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) onSwipeRight();
        else onSwipeLeft();
      } else {
        if (dy > 0) onSwipeDown();
        else onSwipeUp();
      }
    }, { passive: true });
  }

  // Swipe actions
  function onSwipeRight() {
    // spouse
    const sid = spouseOf(state.anchorId);
    renderGrid('Spouse', [sid]);
  }
  function onSwipeLeft() {
    // siblings
    const base = toInt(state.anchorId);
    const sibs = siblingsOf(base).map(String);
    renderGrid('Siblings', sibs);
  }
  function onSwipeDown() {
    // children
    const base = toInt(state.anchorId);
    const kids = childrenOf(base).map(String);
    renderGrid('Children', kids);
  }
  function onSwipeUp() {
    // parents (could be one or two; we only guarantee the direct numeric parent)
    const base = toInt(state.anchorId);
    const p = parentOf(base);
    if (p) renderGrid('Parents', [String(p)]);
    else renderGrid('Parents', []);
  }

  // ====== Long-press SoftEdit ======
  function attachLongPressEdit(el, getId, onSaved) {
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('mousedown', start);
    el.addEventListener('touchend', cancel, { passive: true });
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);

    function start(e) {
      cancel();
      state.longPressTimer = setTimeout(async () => {
        const id = getId();
        const current = state.namesCache[id] || '';
        const name = window.prompt('Edit label (name):', current);
        if (name === null) return;
        setLabel(id, name);
        // Try remote persist; silent if not configured
        await saveLabelRemote(id, name);
        if (onSaved) onSaved(id, name);
      }, state.longPressMs);
    }
    function cancel() {
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }
    }
  }

  // ====== INIT ======
  function init() {
    $('#closeOverlay').addEventListener('click', hideOverlay);
    $('#backBtn').addEventListener('click', () => {
      if (!$('#gridOverlay').classList.contains('hidden')) {
        hideOverlay();
        return;
      }
      const prev = state.history.pop();
      if (prev) loadAnchor(prev);
    });
    $('#startBtn').addEventListener('click', () => {
      const input = prompt('Enter starting ID', state.anchorId || '100000');
      if (input) navigateTo(String(input));
    });

    attachSwipe($('#anchorCard'));
    attachLongPressEdit($('#anchorCard'), () => state.anchorId, (id, name) => {
      // update overlay tile if open
      const tile = document.querySelector(`.tile[data-id="${CSS.escape(id)}"] .name`);
      if (tile) tile.textContent = name;
    });

    const id = idFromURL() || '100000';
    // Do not push history on initial load
    state.anchorId = String(id);
    loadAnchor(state.anchorId);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
