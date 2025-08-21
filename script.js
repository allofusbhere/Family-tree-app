
// v8 — Per-image override: specific IDs render with object-fit: contain (no crop)
(function () {
  'use strict';

  const BUILD = window.BUILD_TAG || 'v8';
  const IMAGES_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const IMAGE_EXT = '.jpg';

  // Add any IDs you want to render full-frame (no cropping)
  const OVERRIDE_CONTAIN = new Set(['100000']); // Fred by default

  const $ = (sel) => document.querySelector(sel);
  const bind = (target, ev, fn, opts) => {
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.addEventListener(ev, fn, opts || false);
  };

  const appState = { anchorId: null, history: [] };

  // Helpers
  const toInt = (id) => parseInt(String(id).split('.')[0], 10);
  const isSpouseId = (id) => String(id).includes('.1');
  const spouseOf = (id) => isSpouseId(id) ? String(id).replace('.1', '') : String(id) + '.1';
  const trailingZerosCount = (n) => { n = toInt(n); let c = 0; while (n % 10 === 0 && n !== 0){ n = Math.floor(n/10); c++; } return c; };
  const magSibling = (n) => Math.pow(10, trailingZerosCount(n));
  const magChildren = (n) => Math.pow(10, Math.max(0, trailingZerosCount(n) - 1));
  const parentOf = (n) => { n = toInt(n); const m = magSibling(n); const digit = Math.floor(n/m) % 10; return n - digit*m; };
  const siblingsOf = (n) => { n = toInt(n); const m = magSibling(n); const digit = Math.floor(n/m)%10; const base = n - digit*m; const out=[]; for(let d=1; d<=9; d++){ const cand=base + d*m; if(cand!==n) out.push(String(cand)); } return out; };
  const childrenOf = (n) => { n = toInt(n); const m = magChildren(n); const out=[]; for(let d=1; d<=9; d++) out.push(String(n + d*m)); return out; };

  const idFromURL = () => { const m = location.hash.match(/id=([0-9.]+)/); if (m) return m[1]; const q = new URLSearchParams(location.search); if (q.get('id')) return q.get('id'); return null; };
  const imageURL = (id) => IMAGES_BASE + id + IMAGE_EXT + '?v=' + encodeURIComponent(BUILD);
  const pushHistory = (id) => { if (appState.anchorId) appState.history.push(appState.anchorId); try{ history.replaceState({}, '', '#id=' + id); }catch{} };
  const navigateTo = (id) => { pushHistory(String(id)); loadAnchor(String(id)); };

  const clearGrid = () => { const g = $('#grid'); if (g) g.innerHTML = ''; };
  const showOverlay = (title) => { const ov = $('#gridOverlay'); if (ov){ $('#overlayTitle').textContent = title || ''; ov.classList.remove('hidden'); } };
  const hideOverlay = () => { const ov = $('#gridOverlay'); if (ov) ov.classList.add('hidden'); };

  // Apply per-image fit mode
  function applyFitMode(imgEl, id){
    if (!imgEl) return;
    if (OVERRIDE_CONTAIN.has(String(id))) {
      imgEl.classList.add('contain');
    } else {
      imgEl.classList.remove('contain');
    }
  }

  const renderTile = (container, id) => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.id = id;
    tile.innerHTML = `<div class="tid">${id}</div><img alt="person"/><div class="name"></div>`;
    const img = tile.querySelector('img');
    applyFitMode(img, id);
    img.src = imageURL(id);
    img.addEventListener('error', () => tile.remove(), { once: true });
    tile.addEventListener('click', () => { navigateTo(id); hideOverlay(); });
    container.appendChild(tile);
  };

  const renderGrid = (title, ids) => {
    clearGrid();
    showOverlay(title);
    const grid = $('#grid');
    if (!grid) return;
    const uniq = [...new Set(ids)];
    uniq.forEach((id) => renderTile(grid, id));
  };

  async function loadAnchor(id) {
    appState.anchorId = String(id);
    const idEl = $('#anchorId');
    if (idEl) idEl.textContent = appState.anchorId;
    const img = $('#anchorImg');
    if (img) {
      applyFitMode(img, appState.anchorId);
      img.src = imageURL(appState.anchorId);
      img.removeAttribute('hidden');
    }
  }

  // Swipes
  function attachSwipe(el){
    if (!el) return;
    let startX = 0, startY = 0, active = false;
    const TH = 30;
    el.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; startX = t.clientX; startY = t.clientY; active = true; }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (!active) return; active = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX, dy = t.clientY - startY;
      if (Math.abs(dx) < TH && Math.abs(dy) < TH) return;
      if (Math.abs(dx) > Math.abs(dy)) { if (dx > 0) onSwipeRight(); else onSwipeLeft(); }
      else { if (dy > 0) onSwipeDown(); else onSwipeUp(); }
    }, { passive: true });
  }

  function onSwipeRight(){
    if (isSpouseId(appState.anchorId)) { navigateTo(spouseOf(appState.anchorId)); return; }
    renderGrid('Spouse', [spouseOf(appState.anchorId)]);
  }
  function onSwipeLeft(){ renderGrid('Siblings', siblingsOf(appState.anchorId)); }
  function onSwipeDown(){ renderGrid('Children', childrenOf(appState.anchorId)); }
  function onSwipeUp(){
    const p = parentOf(appState.anchorId);
    const list = [];
    if (p && p !== 0) { list.push(String(p)); list.push(spouseOf(String(p))); }
    renderGrid('Parents', list);
  }

  function init(){
    bind('#closeOverlay','click', hideOverlay);
    bind('#backBtn','click', () => {
      const ov = $('#gridOverlay');
      if (ov && !ov.classList.contains('hidden')) { hideOverlay(); return; }
      const prev = appState.history.pop();
      if (prev) loadAnchor(prev);
    });
    bind('#startBtn','click', () => {
      const input = prompt('Enter starting ID', appState.anchorId || '100000');
      if (input) navigateTo(String(input));
    });

    attachSwipe($('#anchorCard'));

    const id = idFromURL() || '100000';
    appState.anchorId = String(id);
    loadAnchor(appState.anchorId);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
