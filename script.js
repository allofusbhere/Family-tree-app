// SwipeTree — Full Grid + Any Extension Loader (jpg/jpeg/png/webp; any case)
// Directions: Right→Spouse, Up→Parents, Left→Siblings, Down→Children
(function(){
  'use strict';

  // === CONFIG ===
  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const DEFAULT_START_ID = '100000';
  const MAX_PER_GROUP = 9;
  const EXTENSIONS = ['.jpg','.jpeg','.png','.webp','.JPG','.JPEG','.PNG','.WEBP'];

  // === STATE ===
  let state = {
    anchorId: null,
    history: [],
    touching: null,
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
  function setImageWithProbes(imgEl, basePath, labelText){
    let i = 0;
    function tryNext(){
      if (i >= EXTENSIONS.length){
        imgEl.src = 'data:image/svg+xml;utf8,'+ encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
          <rect width="200" height="200" fill="#000"/>
          <circle cx="100" cy="78" r="42" fill="#222"/>
          <rect x="34" y="120" width="132" height="60" rx="18" fill="#222"/>
          <text x="100" y="190" fill="#666" font-size="14" text-anchor="middle">${labelText||''}</text>
          </svg>`);
        imgEl.onerror = null;
        return;
      }
      const url = basePath + EXTENSIONS[i] + '?v=' + Date.now();
      i++;
      imgEl.onerror = tryNext;
      imgEl.src = url;
    }
    tryNext();
  }

  function asPersonId(idish){ return String(idish).split('.')[0]; }
  function clampList(list){
    const seen = new Set(); const out = [];
    for (const v of list){
      if (!v) continue;
      const key = String(v);
      if (seen.has(key)) continue;
      out.push(key); seen.add(key);
      if (out.length>=MAX_PER_GROUP) break;
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
    anchorWrap.style.visibility = 'hidden';
    grid.scrollTop = 0;
  }
  function closeOverlay(){
    setVisible(overlay, false);
    state.overlayOpen = false;
    anchorWrap.style.visibility = 'visible';
    grid.innerHTML = '';
  }
  function pushHistory(){ if (state.anchorId) state.history.push(state.anchorId); }
  function goBack(){
    if (state.overlayOpen){ closeOverlay(); return; }
    const prev = state.history.pop();
    if (prev){ navigateTo(prev, {push:false}); }
  }
  function setAnchorImage(idish){
    setImageWithProbes(anchorImg, IMAGE_BASE + String(idish), String(idish));
    anchorLabel.textContent = idish;
  }
  function navigateTo(idish, opts){
    opts = opts || {};
    const clean = String(idish).trim();
    if (!/^\d{6,}(\.1)?$/.test(clean)) return;
    if (opts.push !== false) pushHistory();
    state.anchorId = clean;
    setAnchorImage(clean);
    try { history.replaceState({}, '', '#id=' + encodeURIComponent(clean)); } catch {}
  }

  // === FAMILY CALCS ===
  function getParents(idish){
    const id = asPersonId(idish);
    const n = parseInt(id,10); const L = id.length;
    if (isNaN(n)) return [];
    const parentBase = Math.floor(n/10000)*10000;
    if (parentBase===n) return [];
    const p1 = String(parentBase).padStart(L,'0');
    const p2 = p1 + '.1';
    return clampList([p1,p2]);
  }
  function getSiblings(idish){
    const id = asPersonId(idish);
    const n = parseInt(id,10); const L = id.length;
    const parentBase = Math.floor(n/10000)*10000;
    const mySlot = Math.floor((n - parentBase)/10000);
    const sibs = [];
    for (let k=1;k<=9;k++){
      if (k===mySlot) continue;
      sibs.push(String(parentBase + k*10000).padStart(L,'0'));
    }
    return clampList(sibs);
  }
  function getChildren(idish){
    const id = asPersonId(idish);
    const n = parseInt(id,10); const L = id.length;
    const base = Math.floor(n/10000)*10000;
    const kids = [];
    for (let k=1;k<=9;k++){
      kids.push(String(base + k*1000).padStart(L,'0'));
    }
    return clampList(kids);
  }
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
      setImageWithProbes(img, IMAGE_BASE + String(idish), String(idish));
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = idish;
      card.appendChild(img);
      card.appendChild(label);
      card.addEventListener('click', () => { closeOverlay(); navigateTo(asPersonId(idish)); });
      grid.appendChild(card);
    });
  }

  // === GESTURES (robust for iOS Safari) ===
  function onTouchStart(e){
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    state.touching = { x: t.clientX, y: t.clientY, t: Date.now() };
  }
  function onTouchMove(e){
    // prevent iOS from treating short horizontal swipes as scroll when inside stage
    if (!state.touching) return;
    const dx = e.touches[0].clientX - state.touching.x;
    const dy = e.touches[0].clientY - state.touching.y;
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12){
      e.preventDefault();
    }
  }
  function onTouchEnd(e){
    if (!state.touching) return;
    const dx = (e.changedTouches[0].clientX - state.touching.x);
    const dy = (e.changedTouches[0].clientY - state.touching.y);
    const dt = Date.now() - state.touching.t;
    state.touching = null;
    if (dt > 800) return; // long press reserved for future edit
    const THRESH = 40;
    if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) return;
    if (Math.abs(dx) > Math.abs(dy)){
      if (dx > 0){ openOverlay('Spouse'); buildCards(getSpouseCards(state.anchorId)); }
      else { openOverlay('Siblings'); buildCards(getSiblings(state.anchorId)); }
    } else {
      if (dy < 0){ openOverlay('Parents'); buildCards(getParents(state.anchorId)); }
      else { openOverlay('Children'); buildCards(getChildren(state.anchorId)); }
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
  stage.addEventListener('touchstart', onTouchStart, {passive:false});
  stage.addEventListener('touchmove', onTouchMove, {passive:false});
  stage.addEventListener('touchend', onTouchEnd, {passive:true});

  // Auto-load
  window.addEventListener('load', () => {
    const fromHash = (location.hash.match(/id=([^&]+)/)||[])[1];
    if (fromHash){ navigateTo(decodeURIComponent(fromHash)); }
    else { navigateTo(DEFAULT_START_ID); }
  });
})();