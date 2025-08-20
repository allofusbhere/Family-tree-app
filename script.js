(()=>{
  'use strict';

  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const DEFAULT_START_ID = '100000';

  const idInput = document.getElementById('idInput');
  const startBtn = document.getElementById('startBtn');
  const backBtn = document.getElementById('backBtn');
  const statusEl = document.getElementById('status');
  const anchorImg = document.getElementById('anchorImg');
  const anchorLabel = document.getElementById('anchorLabel');
  const stage = document.getElementById('stage');
  const anchorWrap = document.getElementById('anchorWrap');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const grid = document.getElementById('grid');
  const closeOverlayBtn = document.getElementById('closeOverlayBtn');

  let state = { anchorId: null, history: [], overlayOpen:false, touchStart:null };

  function setStatus(msg){ statusEl.textContent = msg; }

  function setVisible(el, show){
    el.classList.toggle('hidden', !show);
    el.setAttribute('aria-hidden', show ? 'false':'true');
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

  function asPersonId(idish){ return String(idish).split('.')[0]; }
  function spouseIdOf(idish){ return asPersonId(idish) + '.1'; }

  // Try multiple extensions; Safari is picky about case
  const EXT_ORDER = ['.jpg','.jpeg','.png','.webp','.JPG','.JPEG','.PNG','.WEBP'];
  function chooseSrc(idish, i=0){
    if(i >= EXT_ORDER.length) return null;
    return IMAGE_BASE + idish + EXT_ORDER[i];
  }
  function loadWithFallback(imgEl, idish){
    let idx = 0;
    function tryNext(){
      const url = chooseSrc(idish, idx++);
      if(!url){ imgEl.src=''; return; }
      imgEl.src = url + '?v=' + Date.now();
    }
    imgEl.onerror = tryNext;
    tryNext();
  }

  function pushHistory(id){ if(id) state.history.push(id); }
  function goBack(){
    if(state.overlayOpen){ closeOverlay(); return; }
    const prev = state.history.pop();
    if(prev) navigateTo(prev, {push:false});
  }

  function navigateTo(idish, opts){
    opts = opts || {};
    const clean = String(idish||'').trim();
    if(!/^\d{6,}(\.1)?$/.test(clean)) return;
    if(opts.push !== false) pushHistory(state.anchorId);
    state.anchorId = clean;
    const baseId = asPersonId(clean);
    setStatus('Loaded ID: ' + baseId);
    anchorLabel.textContent = baseId;
    loadWithFallback(anchorImg, clean);
    try { history.replaceState({}, '', '#id=' + encodeURIComponent(baseId)); } catch{}
  }

  // ===== Family math rules (locked) =====
  function base100k(n){ return Math.floor(n/100000) * 100000; }
  function tenKSlot(n){ return Math.floor((n % 100000)/10000); } // 0..9

  // Parents:
  // - If you're a branch person (110000..160000 within same 100k block), parent is the 100k base (e.g., 100000)
  // - Root like 100000 has no parent
  function getParents(idish){
    const id = parseInt(asPersonId(idish),10);
    if(isNaN(id)) return [];
    const b = base100k(id);
    if(id === b) return [];
    const p = String(b).padStart(String(id).length,'0');
    // optional spouse card of the parent base
    return [p, p+'.1'];
  }

  // Siblings:
  // - Root's siblings are the other hundred-thousand branches within the same million block, e.g., 200000..900000
  // - Branch person's siblings are 110000..160000 in their 100k block (excluding self)
  function getSiblings(idish){
    const id = parseInt(asPersonId(idish),10);
    const L = String(id).length;
    const b = base100k(id);
    const slot = tenKSlot(id);
    const sibs = [];
    if(id === b){
      // root: 200000..900000 within same million block as b (keep millions above)
      for(let s=2; s<=9; s++){
        sibs.push(String(b + s*100000).padStart(L,'0'));
      }
      return sibs;
    }
    // branch: 110000..160000 in that block
    for(let s=1; s<=6; s++){
      const candidate = b + s*10000;
      if(candidate === id) continue;
      sibs.push(String(candidate).padStart(L,'0'));
    }
    return sibs;
  }

  // Children:
  // - Root 100000 → 110000..160000
  // - Branch like 140000 → 141000..149000
  function getChildren(idish){
    const id = parseInt(asPersonId(idish),10);
    const L = String(id).length;
    const b = base100k(id);
    if(id === b){
      // 110000..160000
      const out = [];
      for(let s=1; s<=6; s++){
        out.push(String(b + s*10000).padStart(L,'0'));
      }
      return out;
    }
    // 141000..149000 (preserve the ten-thousands digit of the person)
    const tenk = tenKSlot(id);
    const out = [];
    for(let k=1; k<=9; k++){
      out.push(String(b + tenk*10000 + k*1000).padStart(L,'0'));
    }
    return out;
  }

  function getSpouse(idish){ return [spouseIdOf(idish)]; }

  function buildCards(list){
    grid.innerHTML = '';
    list.forEach(idish => {
      const card = document.createElement('div');
      card.className = 'card';
      const img = document.createElement('img');
      img.alt = idish;
      loadWithFallback(img, idish);
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

  // Touch gestures
  function onTouchStart(e){
    if(!e.touches || e.touches.length!==1) return;
    state.touchStart = { x:e.touches[0].clientX, y:e.touches[0].clientY, t:Date.now() };
  }
  function onTouchEnd(e){
    if(!state.touchStart) return;
    const dx = e.changedTouches[0].clientX - state.touchStart.x;
    const dy = e.changedTouches[0].clientY - state.touchStart.y;
    const dt = Date.now() - state.touchStart.t;
    state.touchStart = null;
    const TH = 40;
    if(dt>800) return; // reserve long-press for future
    if(Math.abs(dx)<TH && Math.abs(dy)<TH) return;

    if(Math.abs(dx) > Math.abs(dy)){
      if(dx>0){ openOverlay('Spouse'); buildCards(getSpouse(state.anchorId)); }
      else    { openOverlay('Siblings'); buildCards(getSiblings(state.anchorId)); }
    } else {
      if(dy<0){ openOverlay('Parents'); buildCards(getParents(state.anchorId)); }
      else    { openOverlay('Children'); buildCards(getChildren(state.anchorId)); }
    }
  }

  // Keyboard for desktop testing
  function onKey(e){
    if(!state.anchorId) return;
    const k = e.key;
    if(k==='ArrowUp'){ openOverlay('Parents'); buildCards(getParents(state.anchorId)); }
    if(k==='ArrowLeft'){ openOverlay('Siblings'); buildCards(getSiblings(state.anchorId)); }
    if(k==='ArrowRight'){ openOverlay('Spouse'); buildCards(getSpouse(state.anchorId)); }
    if(k==='ArrowDown'){ openOverlay('Children'); buildCards(getChildren(state.anchorId)); }
  }

  startBtn.addEventListener('click', ()=>{
    const raw = (idInput.value||'').trim();
    navigateTo(raw || DEFAULT_START_ID);
  });
  backBtn.addEventListener('click', goBack);
  closeOverlayBtn.addEventListener('click', closeOverlay);
  stage.addEventListener('touchstart', onTouchStart, {passive:true});
  stage.addEventListener('touchend', onTouchEnd, {passive:true});
  window.addEventListener('keydown', onKey);

  window.addEventListener('load', ()=>{
    const fromHash = (location.hash.match(/id=([^&]+)/)||[])[1];
    if(fromHash) navigateTo(decodeURIComponent(fromHash));
    else navigateTo(DEFAULT_START_ID);
  });
})();