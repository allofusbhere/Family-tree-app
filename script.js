// SwipeTree RC1 — grid overlays, correct sibling/child math, back/history, configurable image base
(function(){
  'use strict';

  const qs  = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const byId = (id) => document.getElementById(id);
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts||false);

  // Config
  const url = new URL(window.location.href);
  const IMG_BASE = url.searchParams.get('imgBase') || './'; // e.g., 'https://allofusbhere.github.io/family-tree-images/'
  const MAX_PER_GROUP = 9;

  const ui = {
    startBtn: byId('startBtn'),
    backBtn: byId('backBtn'),
    anchorImg: byId('anchorImg'),
    anchorLabel: byId('anchorLabel'),
    gridOverlay: byId('gridOverlay'),
    overlayTitle: byId('overlayTitle'),
    overlayClose: byId('overlayClose'),
    grid: byId('grid'),
    toast: byId('toast'),
  };

  let anchorId = null;
  const historyStack = [];

  function imgSrcFor(id){
    return `${IMG_BASE}${id}.jpg`;
  }

  function showToast(msg, ms=1500){
    ui.toast.textContent = msg;
    ui.toast.classList.remove('hidden');
    clearTimeout(ui.toast._t);
    ui.toast._t = setTimeout(()=> ui.toast.classList.add('hidden'), ms);
  }

  function parseHashId(){
    const m = location.hash.match(/id=(\d+)/);
    return m ? m[1] : null;
  }

  function setHashId(id){
    const newHash = `#id=${id}`;
    if (location.hash !== newHash){
      history.pushState({id}, '', newHash);
    }
  }

  function go(id, pushHistory=true){
    id = String(id);
    if (!/^\d{5,8}$/.test(id)) { showToast('Enter a numeric ID'); return; }
    if (pushHistory && anchorId) historyStack.push(anchorId);
    anchorId = id;
    setHashId(id);
    renderAnchor(id);
  }

  function renderAnchor(id){
    ui.anchorImg.src = imgSrcFor(id);
    ui.anchorImg.alt = `ID ${id}`;
    ui.anchorLabel.textContent = id;
    ui.anchorImg.classList.add('highlight');
    setTimeout(()=> ui.anchorImg.classList.remove('highlight'), 350);
  }

  // ===== Relationship Math =====
  function trailingZeros(n){
    let s = String(n);
    let tz = 0;
    for (let i=s.length-1; i>=0 && s[i]==='0'; i--) tz++;
    return tz;
  }

  function placeValueForChildren(n){
    const tz = trailingZeros(n);
    if (tz <= 0) return 0;           // no zero tail? cannot determine generation
    return Math.pow(10, tz-1);       // modify the next digit to the left of the zero run
  }

  // Parent = zero-out the child digit place
  function computeParentId(n){
    const p = placeValueForChildren(n);
    if (p === 0) return null;
    const digit = Math.floor(n / p) % 10;
    if (digit === 0) return null; // already base branch (no parent above in our scheme)
    const parent = n - (digit * p);
    return parent;
  }

  function computeChildren(n){
    const p = placeValueForChildren(n);
    if (!p) return [];
    const base = n; // lower places already zeros by design
    const out = [];
    for (let k=1; k<=MAX_PER_GROUP; k++){
      out.push(base + k*p);
    }
    return out;
  }

  function computeSiblings(n){
    const p = placeValueForChildren(n);
    if (!p) return [];
    const digit = Math.floor(n / p) % 10;
    const parent = n - (digit * p);
    const out = [];
    for (let k=1; k<=MAX_PER_GROUP; k++){
      if (k === digit) continue;
      out.push(parent + k*p);
    }
    return out;
  }

  // Spouse(s): primary is "<id>.1"; optionally include "<partnerId>.1" if present via hint json later
  function computeSpouses(n){
    return [`${n}.1`];
  }

  // ===== Overlay rendering =====
  function openGrid(title, ids){
    ui.overlayTitle.textContent = title;
    ui.grid.innerHTML = '';
    ids.forEach(id => {
      const tile = document.createElement('button');
      tile.className = 'tile';
      const img = document.createElement('img');
      img.alt = `ID ${id}`;
      img.src = imgSrcFor(id);
      const lab = document.createElement('div');
      lab.className = 'tlabel';
      lab.textContent = id;
      tile.appendChild(img);
      tile.appendChild(lab);
      on(tile, 'click', () => {
        closeOverlay();
        go(String(id));
      });
      ui.grid.appendChild(tile);
    });
    ui.gridOverlay.classList.remove('hidden');
    ui.gridOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeOverlay(){
    ui.gridOverlay.classList.add('hidden');
    ui.gridOverlay.setAttribute('aria-hidden', 'true');
  }

  // ===== Gestures =====
  let touchStart = null;
  const SWIPE_MIN = 28;

  function onTouchStart(e){
    const t = e.touches[0];
    touchStart = { x:t.clientX, y:t.clientY, t:Date.now() };
  }
  function onTouchEnd(e){
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax < SWIPE_MIN && ay < SWIPE_MIN) return;
    if (ax > ay){
      if (dx > 0) handleRight(); else handleLeft();
    } else {
      if (dy > 0) handleDown(); else handleUp();
    }
    touchStart = null;
  }

  // Map: Right=Spouse, Up=Parents, Left=Siblings, Down=Children
  function handleRight(){
    const spouses = computeSpouses(Number(anchorId));
    openGrid('Spouse', spouses);
  }
  function handleLeft(){
    const sibs = computeSiblings(Number(anchorId));
    openGrid('Siblings', sibs);
  }
  function handleDown(){
    const kids = computeChildren(Number(anchorId));
    openGrid('Children', kids);
  }
  function handleUp(){
    const p = computeParentId(Number(anchorId));
    if (p) openGrid('Parents', [p]); else showToast('No parents');
  }

  // ===== Init & binds =====
  function bind(){
    on(ui.startBtn, 'click', () => {
      const existing = parseHashId();
      if (existing){ go(existing, false); return; }
      const v = prompt('Enter starting ID (numbers only):', '');
      if (v) go(v, false);
    });
    on(ui.backBtn, 'click', () => {
      if (ui.gridOverlay && !ui.gridOverlay.classList.contains('hidden')){
        closeOverlay(); return;
      }
      const prev = historyStack.pop();
      if (prev) go(prev, false);
    });
    on(ui.overlayClose, 'click', closeOverlay);

    on(document.body, 'touchstart', onTouchStart, {passive:true});
    on(document.body, 'touchend', onTouchEnd, {passive:true});

    // Desktop swipes via arrow keys for convenience
    on(window, 'keydown', (e) => {
      if (e.key === 'ArrowRight') handleRight();
      else if (e.key === 'ArrowLeft') handleLeft();
      else if (e.key === 'ArrowDown') handleDown();
      else if (e.key === 'ArrowUp') handleUp();
      else if (e.key === 'Escape') closeOverlay();
    });

    // Tap highlight
    on(ui.anchorImg, 'click', () => {
      ui.anchorImg.classList.add('highlight');
      setTimeout(()=> ui.anchorImg.classList.remove('highlight'), 250);
    });

    // Auto-load if hash present
    const hashId = parseHashId();
    if (hashId) go(hashId, false);
  }

  window.addEventListener('DOMContentLoaded', bind);
})();
