(() => {
  'use strict';

  // === Feature Flags ===
  const FLAGS = {
    SWIPE_LEFT: true,
    SWIPE_RIGHT: true,
    SWIPE_UP: true,
    SWIPE_DOWN: true,
    LONG_PRESS_EDIT: false, // soft-edit present but disabled by default
    MAX_PER_GRID: 30
  };

  const BUILD_TAG = "SwipeTree • 20250819-162557 • all-swipes-rc1";

  // === DOM ===
  const $ = (sel,root) => (root||document).querySelector(sel);
  const $$ = (sel,root) => Array.from((root||document).querySelectorAll(sel));
  const stage = $('#stage');
  const anchorCard = $('#anchorCard');
  const anchorImg = $('#anchorImg');
  const anchorLabel = $('#anchorLabel');
  const overlay = $('#overlay');
  const overlayTitle = $('#overlayTitle');
  const grid = $('#grid');
  const backBtn = $('#backBtn');
  const startBtn = $('#startBtn');
  const overlayClose = $('#overlayClose');

  // === State ===
  const historyStack = [];
  let currentId = null; // e.g. "140000" or "140000.1"
  let overlayOpen = false;

  // === Utilities ===
  function parseId(idStr){
    // returns { base: '140000', spouse: false/true }
    const s = String(idStr).trim();
    if(s.includes('.')) {
      const [base, dot, rest] = s.split(/\./);
      return { base, spouse: true };
    }
    return { base: s, spouse: false };
  }
  function formatId(base, spouse){
    return spouse ? base + '.1' : base;
  }
  function clampDigits(n, digits=6){
    const s = String(Math.max(0, Math.floor(Math.abs(n)))).padStart(digits,'0');
    return s.slice(-digits);
  }
  function toInt(base){
    return parseInt(base, 10);
  }

  // Generation math based on agreed rules:
  // siblings share the same parent base (vary the ten-thousands place B for top-level, 
  // or more generally: find the first non-zero digit from left (excluding the first A),
  // zero it to get parent; siblings = all children of that parent at that digit place).
  function parentOf(base){
    let s = clampDigits(base);
    // Find the first non-zero digit from left excluding the first 'A' position (index 0 allowed as well)
    const arr = s.split('').map(d=>parseInt(d,10));
    // We move up one generation by zeroing the first non-zero digit from left (1..5) and everything to the right already zero.
    // Example: 141000 -> parent 140000 (zero C at index 2)
    //          140000 -> parent 100000 (zero B at index 1)
    let idx = -1;
    for(let i=1;i<6;i++){ if(arr[i]!==0){ idx=i; break; } }
    if(idx===-1) return null; // already at top (e.g., 100000)
    arr[idx] = 0;
    for(let j=idx+1;j<6;j++) arr[j]=0;
    return arr.join('');
  }

  function generationStep(base){
    // Determine which digit place is the active generation step for children
    // If thousands place (index 2) is the last non-zero -> children step at hundreds (index 3)?
    // From our settled rule: children increment the thousands place for typical nodes like 140000 -> 141000, 142000...
    // More generally: find the first zero from left *after* the first non-zero -> that's the next generation place.
    const s = clampDigits(base);
    const arr = s.split('').map(d=>parseInt(d,10));
    // Find the first index i where arr[i]===0 and all to the right are 0; that i is the next generation digit.
    // For 140000 => first non-zero after leading 1 is at B=4, next zero index is C (2) -> children step=10^(6-1-2)=1000
    // For 141000 => next zero index is D (3) -> 100
    // For 141100 => next zero index is E (4) -> 10
    // For 141110 => next zero index is F (5) -> 1
    let nextIdx = -1;
    for(let i=1;i<6;i++){ // ignore the very first digit 'A' for stepping
      if(arr[i]===0) { nextIdx = i; break; }
    }
    if(nextIdx===-1) return 0; // no deeper generation
    const power = 6-1-nextIdx;
    return Math.pow(10, power);
  }

  function childrenOf(base, limit=FLAGS.MAX_PER_GRID){
    const step = generationStep(base);
    if(step<=0) return [];
    const kids = [];
    for(let i=1;i<=9 && kids.length<limit;i++){ // up to 9 children
      kids.push(clampDigits(toInt(base) + i*step));
    }
    return kids;
  }

  function siblingsOf(base){
    // Siblings = children of parent (same generation place), excluding self
    const p = parentOf(base);
    if(!p) return [];
    const sibs = childrenOf(p).filter(id => id !== base);
    return sibs;
  }

  function parentsOf(base){
    const p = parentOf(base);
    if(!p) return [];
    // Parent(s): We know the direct parent base is 'p'.
    // If both parents exist, the spouse of p is p.1 (a different person file), but per image scheme
    // each partner has their own image file: child uses ID (e.g., 140000) and partner uses 240000 with .1 for linkage.
    // For display we try to show 'p' and optionally 'p.1' if it exists.
    return [p, p + ".1"];
  }

  function spouseOf(idStr){
    const { base, spouse } = parseId(idStr);
    return spouse ? base : base + ".1";
  }

  // === Image loading helper (hide blanks) ===
  function imageUrlFor(idStr){
    return `${idStr}.jpg`;
  }

  function testImage(idStr){
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ id:idStr, ok:true });
      img.onerror = () => resolve({ id:idStr, ok:false });
      img.src = imageUrlFor(idStr);
    });
  }

  async function filterExisting(ids){
    const unique = Array.from(new Set(ids));
    const checks = await Promise.all(unique.map(id => testImage(id)));
    return checks.filter(x=>x.ok).map(x=>x.id);
  }

  // === Rendering ===
  async function setAnchor(idStr, pushHistory=true){
    if(currentId && pushHistory) historyStack.push(currentId);
    currentId = idStr;
    // Highlight
    anchorCard.classList.add('highlight');
    setTimeout(()=>anchorCard.classList.remove('highlight'), 180);
    // Render image & label
    anchorImg.src = imageUrlFor(idStr);
    anchorImg.alt = idStr;
    $('#buildTag').textContent = BUILD_TAG;
    anchorLabel.textContent = idStr; // (names can be layered later via remote store)
    closeOverlay(false);
    location.hash = "id=" + encodeURIComponent(idStr);
  }

  function openOverlay(title){
    overlayTitle.textContent = title;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden','false');
    overlayOpen = true;
  }
  function closeOverlay(animate=true){
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden','true');
    overlayOpen = false;
    grid.innerHTML = '';
  }

  function tile(idStr){
    const div = document.createElement('button');
    div.className = 'tile';
    div.setAttribute('data-id', idStr);
    div.innerHTML = `<img alt="${idStr}" src="${imageUrlFor(idStr)}"><div class="tlabel">${idStr}</div>`;
    div.addEventListener('click', () => setAnchor(idStr, true));
    return div;
  }

  async function showGrid(kind, ids){
    const list = await filterExisting(ids);
    grid.innerHTML = '';
    if(list.length===0){
      const msg = document.createElement('div');
      msg.style.color = '#aab1bd';
      msg.style.textAlign = 'center';
      msg.style.padding = '2rem';
      msg.textContent = 'No images found.';
      grid.appendChild(msg);
    } else {
      list.forEach(id => grid.appendChild(tile(id)));
    }
    openOverlay(kind);
  }

  // === Relationship Views ===
  async function showChildren(){
    const base = parseId(currentId).base;
    const ids = childrenOf(base);
    await showGrid('Children', ids);
  }
  async function showSiblings(){
    const base = parseId(currentId).base;
    const ids = siblingsOf(base);
    await showGrid('Siblings', ids);
  }
  async function showParents(){
    const base = parseId(currentId).base;
    const ids = parentsOf(base);
    await showGrid('Parents', ids);
  }
  async function showSpouse(){
    const next = spouseOf(currentId);
    // Spouse view acts like a 1-item grid for visual consistency, but tapping navigates.
    const ok = await filterExisting([next]);
    if(ok.length===0){
      // nothing to show
      return;
    }
    await showGrid('Spouse', ok);
  }

  // === Back button logic ===
  function onBack(){
    if(overlayOpen) { closeOverlay(); return; }
    if(historyStack.length>0){
      const prev = historyStack.pop();
      setAnchor(prev, false);
    }
  }

  // === Start button ===
  function askStart(){
    const fromHash = (()=>{
      const m = location.hash.match(/id=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    })();
    const guess = fromHash || '100000';
    let id = prompt('Enter starting ID (e.g., 140000):', guess);
    if(!id) return;
    id = id.trim();
    setAnchor(id, false);
  }

  // === Swipe detection ===
  function installSwipes(){
    let startX=0, startY=0, dx=0, dy=0, touching=false, startTime=0;
    const threshold = 40; // px
    const restraint = 30; // perpendicular limit
    const allowedTime = 600; // ms

    function onStart(e){
      const t = e.touches ? e.touches[0] : e;
      startX = t.clientX; startY = t.clientY;
      startTime = Date.now();
      touching = true;
    }
    function onMove(e){
      if(!touching) return;
      const t = e.touches ? e.touches[0] : e;
      dx = t.clientX - startX; dy = t.clientY - startY;
      // prevent page scroll on significant move
      if(Math.abs(dx)>10 || Math.abs(dy)>10) e.preventDefault();
    }
    function onEnd(e){
      if(!touching) return;
      touching = false;
      const elapsed = Date.now()-startTime;
      let dir = null;
      if(elapsed <= allowedTime){
        if(Math.abs(dx) >= threshold && Math.abs(dy) <= restraint){
          dir = (dx>0) ? 'right' : 'left';
        } else if(Math.abs(dy) >= threshold && Math.abs(dx) <= restraint){
          dir = (dy>0) ? 'down' : 'up';
        }
      }
      dx=0; dy=0;
      if(!dir) return;
      handleSwipe(dir);
    }

    // Attach to stage for anchor swipes; also allow overlay swipes to close it
    stage.addEventListener('touchstart', onStart, {passive:false});
    stage.addEventListener('touchmove', onMove, {passive:false});
    stage.addEventListener('touchend', onEnd, {passive:false});

    overlay.addEventListener('touchstart', onStart, {passive:false});
    overlay.addEventListener('touchmove', onMove, {passive:false});
    overlay.addEventListener('touchend', (e)=>{ onEnd(e); if(!overlayOpen) return; }, {passive:false});

    // Keyboard support (desktop testing)
    window.addEventListener('keydown', (e)=>{
      if(e.key==='ArrowLeft') handleSwipe('left');
      if(e.key==='ArrowRight') handleSwipe('right');
      if(e.key==='ArrowUp') handleSwipe('up');
      if(e.key==='ArrowDown') handleSwipe('down');
      if(e.key==='Escape') closeOverlay();
    });
  }

  function handleSwipe(dir){
    if(dir==='left' && FLAGS.SWIPE_LEFT) return showSiblings();
    if(dir==='right' && FLAGS.SWIPE_RIGHT) return showSpouse();
    if(dir==='up' && FLAGS.SWIPE_UP) return showParents();
    if(dir==='down' && FLAGS.SWIPE_DOWN) return showChildren();
  }

  // === Bindings ===
  function bind(){
    backBtn.addEventListener('click', onBack);
    overlayClose.addEventListener('click', () => closeOverlay());
    startBtn.addEventListener('click', askStart);
    installSwipes();

    // Auto-start from hash if present, else default
    const fromHash = (()=>{
      const m = location.hash.match(/id=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    })();
    setAnchor(fromHash || '100000', false);
  }

  document.addEventListener('DOMContentLoaded', bind);
})();