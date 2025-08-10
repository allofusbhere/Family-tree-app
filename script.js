/* SwipeTree — No-Blank Children Grid + Spouse Toggle */
(() => {
  const img = document.getElementById('anchorImg');
  const stage = document.getElementById('stage');
  const grid = document.getElementById('compassGrid');
  const debugEl = document.getElementById('debug');
  const buildEl = document.getElementById('buildTag');
  const floater = document.getElementById('startFloater');
  const notFoundEl = document.getElementById('notFound');

  // Overlays
  const parentsOverlay = document.getElementById('parentsOverlay');
  const closeParents = document.getElementById('closeParents');
  const parentsGrid = document.getElementById('parentsGrid');

  const childrenOverlay = document.getElementById('childrenOverlay');
  const closeChildren = document.getElementById('closeChildren');
  const childrenGrid = document.getElementById('childrenGrid');
  const childrenEmpty = document.getElementById('childrenEmpty');

  // Build tag
  const t = new Date();
  const pad = n => String(n).padStart(2,'0');
  buildEl.textContent = `build ${t.getFullYear()}${pad(t.getMonth()+1)}${pad(t.getDate())}-${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;

  // Config
  const DEFAULT_BASE = "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";
  const q = new URLSearchParams(location.search);
  const urlBase = q.get('base');
  const IMAGE_BASE = (urlBase && /\/$/.test(urlBase)) ? urlBase : DEFAULT_BASE;
  const EXT_VARIANTS = [".jpg",".JPG",".jpeg",".JPEG",".png",".PNG",".webp",".WEBP"];

  // State
  let currentId = null;
  let historyStack = [];
  let hideMsgTimer = 0;
  let spouseShown = false; // track if .1 variant is currently shown for currentId

  // Utils
  const showDebug = (msg) => {
    debugEl.textContent = msg;
    debugEl.style.opacity = '1';
    clearTimeout(showDebug._t);
    showDebug._t = setTimeout(() => (debugEl.style.opacity = '0'), 1200);
  };
  const clearMsgSoon = (ms=800) => {
    clearTimeout(hideMsgTimer);
    hideMsgTimer = setTimeout(() => { notFoundEl.style.display='none'; notFoundEl.textContent=''; }, ms);
  };
  const tryFetch = (url) => new Promise((resolve, reject) => {
    const test = new Image();
    test.onload = () => resolve(url);
    test.onerror = () => reject(url);
    test.decoding = "async";
    test.loading = "eager";
    test.src = url;
  });
  const loadImageForBaseName = async (baseName) => {
    for (const ext of EXT_VARIANTS) {
      const url = IMAGE_BASE + baseName + ext;
      try { const ok = await tryFetch(url); return ok; } catch {}
    }
    return null;
  };
  const loadImageForId = (id, {spouse=false}={}) => loadImageForBaseName(spouse ? `${id}.1` : `${id}`);

  const showNotFound = (id, spouse) => {
    notFoundEl.style.display = "block";
    notFoundEl.textContent = `Image not found for ID ${id}${spouse ? " (spouse)" : ""} at base:\n` + IMAGE_BASE;
  };

  // Relationship math
  const placesFor = (id) => { const arr=[]; let p=1; while (p<=id){ arr.unshift(p); p*=10; } if(!arr.length) arr.push(1); return arr; };
  const highestNonZeroPlace = (id) => { const P=placesFor(id); for (const place of P){ const d=Math.floor(id/place)%10; if(d>0) return place; } return null; };
  const lowestNonZeroPlace  = (id) => { const P=placesFor(id); for (let i=P.length-1;i>=0;i--){ const place=P[i]; const d=Math.floor(id/place)%10; if(d>0) return place; } return null; };
  const nextLowerPlace = (place, id) => { const P=placesFor(id); const i=P.indexOf(place); return (i<0||i===P.length-1)?null:P[i+1]; };

  const getParentId = (id) => { const p=lowestNonZeroPlace(id); if(!p) return null; const d=Math.floor(id/p)%10; return id - d*p; };
  const getChildrenIds = (id) => { const low = lowestNonZeroPlace(id); const step = nextLowerPlace(low, id); if (!step) return []; const out=[]; for (let n=1;n<=9;n++) out.push(id + n*step); return out; };
  const getSiblingsIds = (id) => { const parent = getParentId(id); if (!parent) return []; const top = highestNonZeroPlace(parent) ?? 0; const step = nextLowerPlace(top, parent); if (!step) return []; const res=[]; for (let n=1;n<=9;n++){ const c=parent+n*step; if(c!==id) res.push(c);} return res; };

  // Compass grid
  const clearGrid = () => grid.querySelectorAll('.cell').forEach(c => c.classList.remove('active'));
  const highlightGrid = (dir) => { clearGrid(); const map={left:'.l',right:'.r',up:'.t',down:'.b'}; const el=grid.querySelector(map[dir]); if(el) el.classList.add('active'); };

  // Animations
  const animateSwap = async (direction, nextSrc, nextId) => {
    img.classList.add('img-anim');
    const exitClass = { left:'exit-left', right:'exit-right', up:'exit-up', down:'exit-down' }[direction];
    img.classList.add(exitClass);
    await new Promise(r => setTimeout(r, 260));
    img.classList.remove(exitClass);
    const enterClass = { left:'enter-right', right:'enter-left', up:'enter-down', down:'enter-up' }[direction];
    img.classList.add(enterClass);
    img.src = nextSrc; img.alt = String(nextId);
    void img.offsetWidth;
    img.classList.add('enter-done');
    await new Promise(r => setTimeout(r, 260));
    img.classList.remove('enter-right','enter-left','enter-up','enter-down','enter-done');
    clearGrid();
    clearMsgSoon(800);
  };

  const goToId = async (nextId, dir, opts={}) => {
    if (!nextId || nextId===currentId) return;
    const preferSpouse = !!opts.preferSpouseVariant;
    const nextSrc = await loadImageForId(nextId, {spouse:preferSpouse});
    if (!nextSrc) {
      if (preferSpouse) {
        const fb = await loadImageForId(nextId, {spouse:false});
        if (!fb) { showNotFound(nextId, false); return; }
        await animateSwap(dir, fb, nextId);
        spouseShown = false;
      } else { showNotFound(nextId, false); return; }
    } else {
      await animateSwap(dir, nextSrc, nextId);
      spouseShown = !!preferSpouse;
    }
    historyStack.push(currentId);
    currentId = nextId;
  };

  // ===== Parents overlay (hides missing) =====
  const openParentsPicker = async (parentId) => {
    parentsGrid.innerHTML = "";
    // Always try primary parent
    const p1Src = await loadImageForId(parentId);
    if (p1Src) {
      const card = makeCard(`Parent • ${parentId}`, p1Src, () => { closeParentsPicker(); goToId(parentId,'up'); });
      parentsGrid.appendChild(card);
    }
    // Try spouse of parent
    const p2Src = await loadImageForId(parentId, {spouse:true});
    if (p2Src) {
      const card = makeCard(`Other Parent • ${parentId}.1`, p2Src, async () => {
        closeParentsPicker();
        await goToId(parentId,'up');
        const spouseSrc = await loadImageForId(parentId, {spouse:true});
        if (spouseSrc) { spouseShown = true; await animateSwap('right', spouseSrc, parentId); }
      });
      parentsGrid.appendChild(card);
    }
    if (!parentsGrid.children.length) { // nothing found
      // fallback to just navigate to parent ID (even if image missing, will showNotFound)
      await goToId(parentId, 'up');
      return;
    }
    parentsOverlay.classList.add('show');
    parentsOverlay.setAttribute('aria-hidden','false');
  };
  const makeCard = (label, src, onClick) => {
    const card = document.createElement('button');
    card.className = "parent-card";
    const imgEl = document.createElement('img');
    imgEl.src = src;
    const lab = document.createElement('div'); lab.className="label"; lab.textContent = label;
    card.appendChild(imgEl); card.appendChild(lab);
    card.addEventListener('click', onClick);
    return card;
  };
  const closeParentsPicker = () => { parentsOverlay.classList.remove('show'); parentsOverlay.setAttribute('aria-hidden','true'); };
  closeParents.addEventListener('click', closeParentsPicker);
  parentsOverlay.addEventListener('click', (e) => { if (e.target.classList.contains('backdrop')) closeParentsPicker(); });

  // ===== Children overlay (no blanks) =====
  const openChildrenPicker = async (id) => {
    childrenGrid.innerHTML = "";
    childrenEmpty.style.display = "none";
    const kids = getChildrenIds(id);
    let found = 0;
    for (let i=0;i<kids.length;i++) {
      const kidId = kids[i];
      const src = await loadImageForId(kidId);
      if (!src) continue; // hide missing
      found++;
      const card = document.createElement('button');
      card.className = "child-card";
      const imgEl = document.createElement('img'); imgEl.src = src; imgEl.alt = String(kidId);
      const label = document.createElement('div'); label.className="label"; label.textContent = `Child ${i+1} • ${kidId}`;
      card.appendChild(imgEl); card.appendChild(label);
      card.addEventListener('click', async () => { closeChildrenPicker(); await goToId(kidId, 'down'); });
      childrenGrid.appendChild(card);
    }
    if (found === 0) {
      childrenEmpty.style.display = "block";
    }
    childrenOverlay.classList.add('show');
    childrenOverlay.setAttribute('aria-hidden','false');
  };
  const closeChildrenPicker = () => { childrenOverlay.classList.remove('show'); childrenOverlay.setAttribute('aria-hidden','true'); };

  // ===== Navigation wrappers =====
  const goToParent = async ()=>{
    const p=getParentId(currentId);
    showDebug(`Parent(s) of ${currentId}: ${p??'—'}`);
    if(!p) { showNotFound('—', false); clearMsgSoon(); return; }
    highlightGrid('up');
    await openParentsPicker(p);
  };
  const goToChildren = async ()=>{
    const kids=getChildrenIds(currentId);
    showDebug(`Children of ${currentId}: ${kids.length?kids.join(', '):'—'}`);
    if(!kids.length) { showNotFound('—', false); clearMsgSoon(); return; }
    highlightGrid('down');
    await openChildrenPicker(currentId);
  };
  const goToSiblings = async ()=>{
    const sibs=getSiblingsIds(currentId);
    showDebug(`Siblings of ${currentId}: ${sibs.length?sibs.join(', '):'—'}`);
    if(sibs.length){ const s=sibs.slice().sort((a,b)=>a-b); const prev=s.filter(x=>x<currentId).pop(); highlightGrid('left'); await goToId(prev ?? s[0],'left'); }
    else { showNotFound('—', false); clearMsgSoon(); }
  };

  // ===== Spouse toggle on right-swipe / button =====
  const toggleSpouse = async () => {
    if (currentId == null) return;
    if (!spouseShown) {
      const src = await loadImageForId(currentId, {spouse:true});
      if (!src) { showNotFound(currentId, true); clearMsgSoon(); return; }
      await animateSwap('right', src, currentId);
      spouseShown = true;
    } else {
      const src = await loadImageForId(currentId, {spouse:false});
      if (!src) { showNotFound(currentId, false); clearMsgSoon(); return; }
      await animateSwap('left', src, currentId);
      spouseShown = false;
    }
  };

  const goBack = async ()=>{
    const prev=historyStack.pop(); if(!prev) return;
    const src = await loadImageForId(prev);
    if (!src) { showNotFound(prev, false); clearMsgSoon(); return; }
    highlightGrid('up'); await animateSwap('up', src, prev);
    currentId=prev; spouseShown=false;
  };

  // Buttons
  document.getElementById('btnParent').addEventListener('click', goToParent);
  document.getElementById('btnKids').addEventListener('click', goToChildren);
  document.getElementById('btnSibs').addEventListener('click', goToSiblings);
  document.getElementById('btnSpouse').addEventListener('click', toggleSpouse);
  document.getElementById('btnBack').addEventListener('click', goBack);

  // Drag detection with axis lock
  let sx=0, sy=0, st=0, dragging=false, lockedAxis=null;
  const MIN_DIST=40, MAX_TIME=700;
  const RESIST=0.85;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const computeDir = (dx, dy) => {
    const ax=Math.abs(dx), ay=Math.abs(dy);
    const BIAS=1.2;
    if (lockedAxis === 'x' || (ax > ay*BIAS && ax > MIN_DIST)) return dx>0 ? 'right' : 'left';
    if (lockedAxis === 'y' || (ay > ax*BIAS && ay > MIN_DIST)) return dy<0 ? 'up' : 'down';
    return ax>ay ? (dx>0?'right':'left') : (dy<0?'up':'down');
  };
  const onStart = (x, y) => { dragging=true; sx=x; sy=y; st=performance.now(); lockedAxis=null; img.classList.add('img-dragging'); stage.classList.add('dragging'); };
  const onMove  = (x, y) => {
    if(!dragging) return;
    const dx=(x-sx)*RESIST, dy=(y-sy)*RESIST;
    if (!lockedAxis) {
      if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy)*1.1) lockedAxis='x';
      else if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)*1.1) lockedAxis='y';
    }
    const dir = computeDir(dx,dy);
    highlightGrid(dir);
    img.style.transform = `translate(${dx}px, ${dy}px)`;
    img.style.opacity = String(clamp(1 - (Math.abs(dx)+Math.abs(dy))/800, .3, 1));
  };
  const onEnd   = async (x, y) => {
    if(!dragging) return;
    dragging=false; lockedAxis=null;
    img.classList.remove('img-dragging'); stage.classList.remove('dragging');
    img.style.transform=''; img.style.opacity='';
    const dx=x-sx, dy=y-sy, dt=performance.now()-st;
    const ax=Math.abs(dx), ay=Math.abs(dy);
    if (dt>MAX_TIME || (ax<MIN_DIST && ay<MIN_DIST)) { clearGrid(); return; }
    const dir = computeDir(dx,dy);
    if (dir==='left')      await goToSiblings();
    else if (dir==='right')await toggleSpouse();
    else if (dir==='up')   await goToParent();
    else                   await goToChildren();
  };

  // Start
  const startWithId = async (id) => {
    const src = await loadImageForId(id);
    if (!src) { showNotFound(id, false); return; }
    img.classList.add('img-anim');
    img.src = src; img.alt = String(id);
    historyStack.length = 0;
    currentId = id;
    spouseShown = false;
    clearMsgSoon(800);
  };
  floater.addEventListener('click', () => {
    const raw = prompt('Enter starting ID (e.g., 140000):', localStorage.getItem('lastStartId') || '');
    const id = Number(String(raw||'').trim().split('.')[0]);
    if (!Number.isFinite(id)) return;
    localStorage.setItem('lastStartId', String(id));
    startWithId(id);
  });
  const urlStartId = Number(String(q.get('id')||'').trim().split('.')[0]);
  if (Number.isFinite(urlStartId)) { localStorage.setItem('lastStartId', String(urlStartId)); startWithId(urlStartId); }
  else { floater.click(); }
})();