// SwipeTree — Buttons + Gestures Grid Build (0819–0820 rules)
// - Right: Spouse (only right)
// - Up: Parents
// - Left: Siblings
// - Down: Children
// - Tap grid item to navigate
// - Back closes grid first, then history
// - Anchor large & centered; no edit on load; long-press later for SoftEdit

(function(){
  'use strict';

  // === CONFIG ===
  const IMAGE_BASE = 'https://allofusbhere.github.io/Family-tree-images/'; // flat repo with JPGs
  const DEFAULT_START_ID = '100000'; // per 08/16 notes
  const MAX_PER_GROUP = 9; // cap for children/siblings

  // === STATE ===
  let state = {
    anchorId: null,
    history: [],
    touchStart: null,
    overlayOpen: false
  };

  // === DOM ===
  const idInput = document.getElementById('idInput');
  const startBtn = document.getElementById('startBtn');
  const backBtn = document.getElementById('backBtn');
  const anchorImg = document.getElementById('anchorImg');
  const anchorLabel = document.getElementById('anchorLabel');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const grid = document.getElementById('grid');
  const closeOverlayBtn = document.getElementById('closeOverlayBtn');
  const stage = document.getElementById('stage');
  const anchorWrap = document.getElementById('anchorWrap');

  // === HELPERS ===
  function imgURL(idish){
    const suffix = String(idish).endsWith('.1') ? '.jpg' : '.jpg';
    // We keep extension .jpg for both person and spouse (.1)
    return IMAGE_BASE + String(idish) + suffix;
  }

  function isSpouseId(idish){
    return String(idish).includes('.1');
  }

  function asPersonId(idish){
    return String(idish).split('.')[0];
  }

  function digits(n){ return String(n).replace(/\D/g,''); }

  function clampList(list){
    // remove falsy, unique, limit MAX_PER_GROUP
    const seen = new Set();
    const out = [];
    for (const v of list){
      const key = String(v);
      if (!v) continue;
      if (seen.has(key)) continue;
      out.push(key);
      seen.add(key);
      if (out.length >= MAX_PER_GROUP) break;
    }
    return out;
  }

  function setVisible(el, show){
    el.classList.toggle('hidden', !show);
    el.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function openOverlay(title){
    overlayTitle.textContent = title;
    setVisible(overlay, true);
    state.overlayOpen = true;
    anchorWrap.style.visibility = 'hidden'; // hide anchor behind grid
    grid.scrollTop = 0;
  }

  function closeOverlay(){
    setVisible(overlay, false);
    state.overlayOpen = false;
    anchorWrap.style.visibility = 'visible';
    grid.innerHTML = '';
  }

  function pushHistory(id){
    if (state.anchorId) state.history.push(state.anchorId);
  }

  function goBack(){
    if (state.overlayOpen){ closeOverlay(); return; }
    const prev = state.history.pop();
    if (prev){ navigateTo(prev, {push:false}); }
  }

  function setAnchorImage(idish){
    const url = imgURL(idish);
    anchorImg.src = url + '?v=' + Date.now(); // cache-bust
    anchorImg.onerror = function(){
      // fallback silhouette
      anchorImg.src = 'data:image/svg+xml;utf8,'+ encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#000"/>
        <circle cx="100" cy="78" r="42" fill="#222"/>
        <rect x="34" y="120" width="132" height="60" rx="18" fill="#222"/>
        <text x="100" y="190" fill="#666" font-size="14" text-anchor="middle">${idish}</text>
        </svg>`);
    };
    anchorLabel.textContent = idish;
  }

  function navigateTo(idish, opts){
    opts = opts || {};
    const clean = String(idish).trim();
    if (!/^\d{6,}(\.1)?$/.test(clean)){
      // Require 6+ digits; allow .1 spouse suffix
      return;
    }
    if (opts.push !== false) pushHistory(state.anchorId);
    state.anchorId = clean;
    setAnchorImage(clean);
    // update URL hash so Back works at OS level later
    try { history.replaceState({}, '', '#id=' + encodeURIComponent(clean)); } catch {}
  }

  // === FAMILY CALCS (per user rules) ===
  // Parent: zero out the ten-thousands place → parent base
  function getParents(idish){
    const id = asPersonId(idish);
    const n = parseInt(id, 10);
    if (isNaN(n)) return [];
    // parent base is n with ten-thousands digit set to 0
    const parentBase = Math.floor(n/10000)*10000;
    if (parentBase===n) return []; // branch root; no parent above
    // Traditionally show two parents; second parent is other branch (+100000)?
    // We only guarantee the base parent image exists; include optional .1 spouse image as the second
    const p1 = String(parentBase).padStart(id.length, '0');
    const p2 = p1 + '.1'; // partner via spouse-file convention
    return clampList([p1, p2]);
  }

  // Siblings: same parentBase, vary ten-thousands digit 1..9
  function getSiblings(idish){
    const id = asPersonId(idish);
    const n = parseInt(id, 10);
    const L = id.length;
    const parentBase = Math.floor(n/10000)*10000;
    const mySlot = Math.floor((n - parentBase)/10000); // 1..9
    const sibs = [];
    for (let k=1;k<=9;k++){
      if (k===mySlot) continue;
      sibs.push(String(parentBase + k*10000).padStart(L,'0'));
    }
    return clampList(sibs);
  }

  // Children: keep ten-thousands digit, set thousands digit 1..9
  function getChildren(idish){
    const id = asPersonId(idish);
    const n = parseInt(id, 10);
    const L = id.length;
    const base = Math.floor(n/1000)*1000; // zero out lower (<= thousands)
    const thousandsSlotNow = Math.floor((n - Math.floor(n/10000)*10000)/1000); // current thousands slot
    const kids = [];
    for (let k=1;k<=9;k++){
      kids.push(String(Math.floor(n/10000)*10000 + k*1000).padStart(L,'0'));
    }
    return clampList(kids);
  }

  // Spouse: show the ".1" card if available
  function getSpouseCards(idish){
    const id = asPersonId(idish);
    return clampList([id + '.1']);
  }

  function buildCards(list){
    grid.innerHTML = '';
    list.forEach(idish => {
      const card = document.createElement('div');
      card.className = 'card';
      const img = document.createElement('img');
      img.alt = idish;
      img.src = imgURL(idish);
      img.onerror = function(){ this.style.opacity = 0.15; };
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = idish;
      card.appendChild(img);
      card.appendChild(label);
      card.addEventListener('click', () => {
        closeOverlay();
        navigateTo(asPersonId(idish));
      });
      grid.appendChild(card);
    });
  }

  // === GESTURES ===
  function onTouchStart(e){
    if (!e.touches || e.touches.length!==1) return;
    state.touchStart = { x:e.touches[0].clientX, y:e.touches[0].clientY, t: Date.now() };
  }
  function onTouchEnd(e){
    if (!state.touchStart) return;
    const dx = (e.changedTouches[0].clientX - state.touchStart.x);
    const dy = (e.changedTouches[0].clientY - state.touchStart.y);
    const dt = Date.now() - state.touchStart.t;
    state.touchStart = null;
    const THRESH = 40; // px
    const FAST = 500; // ms
    if (dt>800) return; // long press reserved for edit later
    if (Math.abs(dx)<THRESH && Math.abs(dy)<THRESH) return;
    if (Math.abs(dx)>Math.abs(dy)){
      if (dx>0){ // RIGHT → SPOUSE
        openOverlay('Spouse');
        buildCards(getSpouseCards(state.anchorId));
      } else {   // LEFT → SIBLINGS
        openOverlay('Siblings');
        buildCards(getSiblings(state.anchorId));
      }
    } else {
      if (dy<0){ // UP → PARENTS
        openOverlay('Parents');
        buildCards(getParents(state.anchorId));
      } else {   // DOWN → CHILDREN
        openOverlay('Children');
        buildCards(getChildren(state.anchorId));
      }
    }
  }

  // === Binds ===
  startBtn.addEventListener('click', () => {
    const raw = (idInput.value || '').trim();
    const startId = raw || DEFAULT_START_ID;
    navigateTo(startId);
  });
  backBtn.addEventListener('click', goBack);
  closeOverlayBtn.addEventListener('click', closeOverlay);
  stage.addEventListener('touchstart', onTouchStart, {passive:true});
  stage.addEventListener('touchend', onTouchEnd, {passive:true});

  // Auto-load default for quick test
  window.addEventListener('load', () => {
    const fromHash = (location.hash.match(/id=([^&]+)/)||[])[1];
    if (fromHash){
      navigateTo(decodeURIComponent(fromHash));
    } else {
      navigateTo(DEFAULT_START_ID);
    }
  });
})();