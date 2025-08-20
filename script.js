// SwipeTree — Generational Logic Build
(function(){
  'use strict';

  // ====== CONFIG ======
  const DEFAULT_START_ID = '100000';           // Current default; can be changed to prompt on load later
  const IMAGES_BASE = 'https://allofusbhere.github.io/family-tree-images/'; // Images live in images repo (not app repo)
  const IMG_EXTS = ['.jpg', '.jpeg', '.png', '.webp']; // Try in order
  const BUILD_TAG = 'genlogic-v1-20250820';

  // ====== DOM ======
  const anchorImg = document.getElementById('anchorImg');
  const anchorLabel = document.getElementById('anchorLabel');
  const anchorCard = document.getElementById('anchorCard');
  const stage = document.getElementById('stage');
  const gridOverlay = document.getElementById('gridOverlay');
  const grid = document.getElementById('grid');
  const gridTitle = document.getElementById('gridTitle');
  const closeGridBtn = document.getElementById('closeGrid');
  const startIdInput = document.getElementById('startId');
  const startBtn = document.getElementById('startBtn');
  const goBtn = document.getElementById('goBtn');
  const backBtn = document.getElementById('backBtn');
  const statusEl = document.getElementById('status');

  // ====== STATE ======
  const historyStack = [];
  let anchorId = null;        // e.g., "140000" or "140000.1"
  let spouseToggleBase = null; // numeric part for two-state spouse toggle (e.g., "140000")

  // ====== UTILS ======
  function isSpouse(id){ return /\.\d+$/.test(id); }
  function baseId(id){ return String(id).split('.')[0]; }
  function withSuffix(id,sfx){ return baseId(id)+sfx; }
  function cacheBust(url){ return url + (url.includes('?') ? '&' : '?') + 'v=' + BUILD_TAG; }

  function tryImageUrls(id){
    // Return candidate URLs (first that loads wins)
    const bids = [id].concat(isSpouse(id) ? [] : []); // keep simple
    const urls = [];
    for (const ext of IMG_EXTS){
      urls.push(cacheBust(IMAGES_BASE + id + ext));
    }
    return urls;
  }

  function loadImgTo(el, id){
    return new Promise((resolve)=>{
      const urls = tryImageUrls(id);
      let idx = 0;
      function tryNext(){
        if (idx >= urls.length){
          el.removeAttribute('src');
          resolve(false);
          return;
        }
        const u = urls[idx++];
        const test = new Image();
        test.onload = ()=>{ el.src = u; resolve(true); };
        test.onerror = tryNext;
        test.src = u;
      }
      tryNext();
    });
  }

  function setStatus(msg){ statusEl.textContent = msg || ''; }

  function pushHistory(id){
    if (anchorId) historyStack.push(anchorId);
    anchorId = id;
    updateHash();
  }

  function updateHash(){
    try {
      const h = '#id=' + encodeURIComponent(anchorId);
      if (location.hash !== h) history.replaceState(null,'',h);
    } catch{}
  }

  function parseHash(){
    const m = location.hash.match(/[#&]id=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // Extract the current generation multiplier from ID (rightmost non-zero digit place).
  // Returns 10000, 1000, 100, 10, or 1. If none found (all trailing zeros), returns the highest active place.
  function currentMultiplier(idNumStr){
    // Use only base numeric portion
    const s = baseId(idNumStr);
    // From right to left, find rightmost non-zero
    for (let i = s.length - 1, place=1; i>=0; i--, place*=10){
      const d = s[i] - '0';
      if (d !== 0) return place;
    }
    // If all zeros (branch root), multiplier is 10000 (first children digit place for 6-digit scheme)
    return 10000;
  }

  function parentOf(idNumStr){
    const s = baseId(idNumStr);
    const mult = currentMultiplier(s);
    // birthOrder is digit at that place
    const n = parseInt(s,10);
    const digit = Math.floor(n / mult) % 10;
    const parentN = n - (digit * mult);
    return String(parentN).padStart(s.length,'0');
  }

  function siblingsOf(idNumStr){
    const s = baseId(idNumStr);
    const mult = currentMultiplier(s);
    const parent = parentOf(s);
    const parentN = parseInt(parent,10);
    const out = [];
    for (let k=1; k<=9; k++){
      const sib = String(parentN + k*mult).padStart(s.length,'0');
      if (sib !== s) out.push(sib);
    }
    return out;
  }

  function childrenOf(idNumStr){
    const s = baseId(idNumStr);
    const mult = currentMultiplier(s);
    const childMult = Math.floor(mult/10);
    if (childMult < 1) return []; // cannot go deeper than ones place
    const n = parseInt(s,10);
    const out = [];
    for (let k=1; k<=9; k++){
      out.push(String(n + k*childMult).padStart(s.length,'0'));
    }
    return out;
  }

  // ====== RENDER ======
  async function showAnchor(id){
    // Expect id maybe with .1 spouse
    spouseToggleBase = baseId(id);
    await loadImgTo(anchorImg, id);
    anchorLabel.textContent = id;
    setStatus('');
  }

  function hideGrid(){ gridOverlay.classList.add('hidden'); gridTitle.textContent=''; grid.innerHTML=''; }
  function showGrid(title, ids){
    gridTitle.textContent = title;
    grid.innerHTML = '';
    ids.forEach(async (pid)=>{
      const tile = document.createElement('div');
      tile.className = 'tile';
      const img = document.createElement('img');
      const cap = document.createElement('div');
      cap.className = 'caption';
      cap.textContent = pid;
      tile.appendChild(img);
      tile.appendChild(cap);
      grid.appendChild(tile);
      // load image; if not found, hide tile
      const ok = await loadImgTo(img, pid);
      if (!ok) tile.classList.add('empty');
      tile.addEventListener('click', ()=>{
        hideGrid();
        navigateTo(pid);
      });
    });
    gridOverlay.classList.remove('hidden');
  }

  function closeIfOpenOr(fallback){
    if (!gridOverlay.classList.contains('hidden')){
      hideGrid();
      return;
    }
    fallback();
  }

  function navigateTo(id){
    pushHistory(id);
    showAnchor(id);
  }

  // ====== INPUT / START ======
  function startFromInput(){
    const val = (startIdInput.value || '').trim();
    const id = val || DEFAULT_START_ID;
    navigateTo(id);
  }

  // ====== GESTURES ======
  // Simple swipe detector
  let touchStartX=0, touchStartY=0, touchActive=false;
  const SWIPE_THRESHOLD = 40;

  function onTouchStart(e){
    const t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchActive = true;
  }
  function onTouchEnd(e){
    if (!touchActive) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    touchActive = false;
    if (ax < SWIPE_THRESHOLD && ay < SWIPE_THRESHOLD) return;

    if (ax > ay){
      if (dx > 0) onSwipeRight();
      else onSwipeLeft();
    } else {
      if (dy > 0) onSwipeDown();
      else onSwipeUp();
    }
  }

  function onSwipeUp(){
    // Parents
    const p = parentOf(anchorId);
    const candidates = [p]; // support single known parent tile (hide if missing)
    showGrid('Parents', candidates);
  }

  function onSwipeLeft(){
    // Siblings
    const sibs = siblingsOf(anchorId);
    showGrid('Siblings', sibs);
  }

  function onSwipeDown(){
    // Children
    const kids = childrenOf(anchorId);
    showGrid('Children', kids);
  }

  async function onSwipeRight(){
    // Spouse two-state toggle: base <-> base.1
    const a = anchorId;
    const b = baseId(a);
    const next = (a === b) ? withSuffix(b,'.1') : b;
    // If next doesn't exist, keep current and show status
    const ok = await loadImgTo(new Image(), next);
    if (ok){
      navigateTo(next);
    } else {
      setStatus('No spouse image found for ' + b);
    }
  }

  // ====== BACK ======
  function onBack(){
    closeIfOpenOr(()=>{
      if (historyStack.length){
        const prev = historyStack.pop();
        anchorId = null; // so pushHistory doesn't add current again
        navigateTo(prev);
      }
    });
  }

  // ====== BOOT ======
  function boot(){
    // Bind
    stage.addEventListener('touchstart', onTouchStart, {passive:true});
    stage.addEventListener('touchend', onTouchEnd, {passive:true});
    closeGridBtn.addEventListener('click', hideGrid);
    backBtn.addEventListener('click', onBack);
    startBtn.addEventListener('click', ()=>{
      startIdInput.value = DEFAULT_START_ID;
      startFromInput();
    });
    goBtn.addEventListener('click', startFromInput);

    // Deep link
    const h = parseHash();
    if (h){
      navigateTo(h);
    } else {
      // Autoload default anchor for faster testing
      startIdInput.value = DEFAULT_START_ID;
      startFromInput();
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();