// SwipeTree — Navigation Stable (iPad-safe)
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

  const asPersonId = idish => String(idish).split('.')[0];

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

  // === FAMILY CALCS (locked rules) ===
  // Parents: parent base = zero ten-thousands digit
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
  // Siblings: same parentBase, vary ten-thousands digit 1..9 (exclude self)
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
  // Children: keep ten-thousands digit, set thousands 1..9
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
  // Spouse: .1 file if available
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

  // === SWIPES (Pointer Events with iPad-safe settings) ===
  let startPt = null;
  function onPointerDown(e){
    if (e.isPrimary === false) return;
    startPt = { x:e.clientX, y:e.clientY, t:Date.now() };
  }
  function onPointerUp(e){
    if (!startPt) return;
    const dx = e.clientX - startPt.x;
    const dy = e.clientY - startPt.y;
    const dt = Date.now() - startPt.t;
    startPt = null;
    if (dt > 800) return;
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
  // Bind
  if ('onpointerdown' in window){
    stage.addEventListener('pointerdown', onPointerDown, {passive:false});
    stage.addEventListener('pointerup', onPointerUp, {passive:false});
  } else {
    // Fallback for older browsers
    stage.addEventListener('touchstart', (e)=>{ if (e.touches && e.touches[0]) { startPt = {x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()}; } }, {passive:false});
    stage.addEventListener('touchend', (e)=>{
      if (!startPt) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      onPointerUp({ clientX:t.clientX, clientY:t.clientY });
    }, {passive:false});
  }

  // === Binds ===
  startBtn.addEventListener('click', () => {
    const raw = (idInput.value || '').trim();
    const startId = raw || DEFAULT_START_ID;
    navigateTo(startId);
  });
  backBtn.addEventListener('click', goBack);
  closeOverlayBtn.addEventListener('click', closeOverlay);

  // Auto-load
  window.addEventListener('load', () => {
    const m = location.hash.match(/id=([^&]+)/);
    const fromHash = m && m[1] ? decodeURIComponent(m[1]) : null;
    navigateTo(fromHash || DEFAULT_START_ID);
  });
})();