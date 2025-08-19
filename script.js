(() => {
  'use strict';

  // === Feature Flags ===
  const FLAGS = {
    SWIPE_LEFT:  true,
    SWIPE_RIGHT: true,
    SWIPE_UP:    true,
    SWIPE_DOWN:  true,
    LONG_PRESS_EDIT: false,
    MAX_PER_GRID: 30
  };

  const BUILD_TAG = "SwipeTree • 20250819-172702 • all-swipes-rc1d (imgbase fixed)";

  // === DOM ===
  const $  = (sel,root) => (root||document).querySelector(sel);
  const $$ = (sel,root) => Array.from((root||document).querySelectorAll(sel));
  const stage        = $('#stage');
  const anchorCard   = $('#anchorCard');
  const anchorImg    = $('#anchorImg');
  const anchorLabel  = $('#anchorLabel');
  const overlay      = $('#overlay');
  const overlayTitle = $('#overlayTitle');
  const grid         = $('#grid');
  const backBtn      = $('#backBtn');
  const startBtn     = $('#startBtn');
  const overlayClose = $('#overlayClose');

  // === State ===
  const historyStack = [];
  let currentId = null;
  let overlayOpen = false;

  // === Utilities ===
  const IMG_BASE = (window.SWIPE_TREE_IMG_BASE || "https://allofusbhere.github.io/family-tree-images/").replace(/\/+$/, '/') ;

  function parseId(idStr){
    const s = String(idStr).trim();
    if (s.includes('.')) return { base: s.split('.')[0], spouse: true };
    return { base: s, spouse: false };
  }
  function clampDigits(n, digits=6){
    const s = String(Math.max(0, Math.floor(Math.abs(n)))).padStart(digits,'0');
    return s.slice(-digits);
  }
  function toInt(base){ return parseInt(base, 10); }

  // Parent logic: zero the first non-zero digit from the left after the leading digit.
  function parentOf(base){
    const s = clampDigits(base);
    const arr = s.split('').map(d=>parseInt(d,10));
    let idx = -1;
    for(let i=1;i<6;i++){ if(arr[i]!==0){ idx=i; break; } }
    if(idx===-1) return null; // already top
    arr[idx] = 0;
    for(let j=idx+1;j<6;j++) arr[j]=0;
    return arr.join('');
  }

  // Children step: next zero digit from the left after the current non-zero chain.
  function generationStep(base){
    const s = clampDigits(base);
    const arr = s.split('').map(d=>parseInt(d,10));
    let nextIdx = -1;
    for(let i=1;i<6;i++){ if(arr[i]===0){ nextIdx = i; break; } }
    if(nextIdx===-1) return 0;
    const power = 6-1-nextIdx;
    return Math.pow(10, power);
  }

  function childrenOf(base, limit=FLAGS.MAX_PER_GRID){
    const step = generationStep(base);
    if(step<=0) return [];
    const kids = [];
    for(let i=1;i<=9 && kids.length<limit;i++){
      kids.push(clampDigits(toInt(base) + i*step));
    }
    return kids;
  }

  function siblingsOf(base){
    const p = parentOf(base);
    if(!p) return [];
    return childrenOf(p).filter(id => id !== base);
  }

  function parentsOf(base){
    const p = parentOf(base);
    if(!p) return [];
    return [p, p + ".1"];
  }

  function spouseOf(idStr){
    const { base, spouse } = parseId(idStr);
    return spouse ? base : base + ".1";
  }

  // === Image helpers ===
  const imageUrlFor = idStr => IMG_BASE + idStr + ".jpg";

  function testImage(idStr){
    return new Promise(resolve => {
      const img = new Image();
      img.onload  = () => resolve({ id:idStr, ok:true });
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

    anchorCard.classList.add('highlight');
    setTimeout(()=>anchorCard.classList.remove('highlight'), 180);

    anchorImg.src = imageUrlFor(idStr);
    anchorImg.alt = idStr;
    $('#buildTag').textContent = BUILD_TAG;
    anchorLabel.textContent = idStr;

    closeOverlay(false);
    location.hash = "id=" + encodeURIComponent(idStr);
  }

  function openOverlay(title){
    overlayTitle.textContent = title;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden','false');
    overlayOpen = true;
  }
  function closeOverlay(){
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

  // === Relationship views ===
  async function showChildren(){
    const base = parseId(currentId).base;
    await showGrid('Children', childrenOf(base));
  }
  async function showSiblings(){
    const base = parseId(currentId).base;
    await showGrid('Siblings', siblingsOf(base));
  }
  async function showParents(){
    const base = parseId(currentId).base;
    await showGrid('Parents', parentsOf(base));
  }
  async function showSpouse(){
    const next = spouseOf(currentId);
    const ok = await filterExisting([next]);
    if(ok.length===0) return;
    await showGrid('Spouse', ok);
  }

  // === Back ===
  function onBack(){
    if(overlayOpen){ closeOverlay(); return; }
    if(historyStack.length>0){
      const prev = historyStack.pop();
      setAnchor(prev, false);
    }
  }

  // === Start ===
  function askStart(){
    const m = location.hash.match(/id=([^&]+)/);
    const guess = m ? decodeURIComponent(m[1]) : '100000';
    let id = prompt('Enter starting ID (e.g., 140000):', guess);
    if(!id) return;
    setAnchor(id.trim(), false);
  }

  // === Swipes ===
  function installSwipes(){
    let startX=0, startY=0, dx=0, dy=0, touching=false, startTime=0;
    const threshold = 40;   // px
    const restraint = 30;   // px
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
      if(Math.abs(dx)>10 || Math.abs(dy)>10) e.preventDefault();
    }
    function onEnd(){
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

    // Attach
    stage.addEventListener('touchstart', onStart, {passive:false});
    stage.addEventListener('touchmove',  onMove,  {passive:false});
    stage.addEventListener('touchend',   onEnd,   {passive:false});

    overlay.addEventListener('touchstart', onStart, {passive:false});
    overlay.addEventListener('touchmove',  onMove,  {passive:false});
    overlay.addEventListener('touchend',   onEnd,   {passive:false});

    // Keyboard (desktop)
    window.addEventListener('keydown', (e)=>{
      if(e.key==='ArrowLeft')  handleSwipe('left');
      if(e.key==='ArrowRight') handleSwipe('right');
      if(e.key==='ArrowUp')    handleSwipe('up');
      if(e.key==='ArrowDown')  handleSwipe('down');
      if(e.key==='Escape')     closeOverlay();
    });
  }

  function handleSwipe(dir){
    if(dir==='left'  && FLAGS.SWIPE_LEFT)  return showSiblings();
    if(dir==='right' && FLAGS.SWIPE_RIGHT) return showSpouse();
    if(dir==='up'    && FLAGS.SWIPE_UP)    return showParents();
    if(dir==='down'  && FLAGS.SWIPE_DOWN)  return showChildren();
  }

  // === Bind ===
  function bind(){
    backBtn.addEventListener('click', onBack);
    overlayClose.addEventListener('click', () => closeOverlay());
    startBtn.addEventListener('click', askStart);
    installSwipes();

    const m = location.hash.match(/id=([^&]+)/);
    setAnchor(m ? decodeURIComponent(m[1]) : '100000', false);
  }

  document.addEventListener('DOMContentLoaded', bind);
})();