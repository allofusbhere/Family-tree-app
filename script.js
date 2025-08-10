/* SwipeTree — Fix 2: correct parent math + vertical swipe bias (axis lock) */
(() => {
  const img = document.getElementById('anchorImg');
  const stage = document.getElementById('stage');
  const grid = document.getElementById('compassGrid');
  const debugEl = document.getElementById('debug');
  const buildEl = document.getElementById('buildTag');
  const floater = document.getElementById('startFloater');
  const notFoundEl = document.getElementById('notFound');

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

  const parseId = (raw) => {
    const s = String(raw || "").trim();
    const first = s.split('.')[0];
    const n = Number(first);
    return Number.isFinite(n) ? n : null;
  };

  const tryFetch = (url) => new Promise((resolve, reject) => {
    const test = new Image();
    test.onload = () => resolve(url);
    test.onerror = () => reject(url);
    test.decoding = "async";
    test.loading = "eager";
    test.src = url;
  });

  const loadImageForId = async (id, {spouse=false}={}) => {
    const baseName = spouse ? `${id}.1` : `${id}`;
    for (const ext of EXT_VARIANTS) {
      const url = IMAGE_BASE + baseName + ext;
      try { const ok = await tryFetch(url); return ok; } catch {}
    }
    return null;
  };

  const showNotFound = (id, spouse) => {
    notFoundEl.style.display = "block";
    notFoundEl.textContent = `Image not found for ID ${id}${spouse ? " (spouse)" : ""} at base:\n` + IMAGE_BASE;
  };

  // Relationship math (dynamic places)
  const placesFor = (id) => {
    const arr = [];
    let p = 1;
    while (p <= id) { arr.unshift(p); p *= 10; }
    if (arr.length === 0) arr.push(1);
    return arr;
  };
  const highestNonZeroPlace = (id) => {
    const P = placesFor(id);
    for (const place of P) {
      const d = Math.floor(id/place) % 10;
      if (d > 0) return place;
    }
    return null;
  };
  const lowestNonZeroPlace = (id) => {
    const P = placesFor(id);
    for (let i = P.length - 1; i >= 0; i--) {
      const place = P[i];
      const d = Math.floor(id/place) % 10;
      if (d > 0) return place;
    }
    return null;
  };
  const nextLowerPlace = (place, id) => {
    const P = placesFor(id);
    const i = P.indexOf(place);
    return (i < 0 || i === P.length - 1) ? null : P[i+1];
  };
  const getParentId = (id) => { // remove lowest non-zero digit
    const p = lowestNonZeroPlace(id);
    if (!p) return null;
    const d = Math.floor(id/p) % 10;
    return id - d*p;
  };
  const getChildrenIds = (id) => {
    const top = highestNonZeroPlace(id);
    const step = nextLowerPlace(top, id);
    if (!step) return [];
    const out = [];
    for (let n=1;n<=9;n++) out.push(id + n*step);
    return out;
  };
  const getSiblingsIds = (id) => {
    const parent = getParentId(id);
    if (!parent) return [];
    const top = highestNonZeroPlace(parent) ?? 0;
    const step = nextLowerPlace(top, parent);
    if (!step) return [];
    const res = [];
    for (let n=1;n<=9;n++){ const c = parent + n*step; if(c !== id) res.push(c); }
    return res;
  };

  // Grid helpers
  const clearGrid = () => grid.querySelectorAll('.cell').forEach(c => c.classList.remove('active'));
  const highlightGrid = (dir) => {
    clearGrid();
    const map = { left: '.l', right: '.r', up: '.t', down: '.b' };
    const el = grid.querySelector(map[dir]);
    if (el) el.classList.add('active');
  };

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
      } else {
        showNotFound(nextId, false);
        return;
      }
    } else {
      await animateSwap(dir, nextSrc, nextId);
    }
    historyStack.push(currentId);
    currentId = nextId;
  };

  const goToParent = async ()=>{ const p=getParentId(currentId); showDebug(`Parent of ${currentId}: ${p??'—'}`);
    if(p) { highlightGrid('up'); await goToId(p,'up'); } else { showNotFound('—', false); clearMsgSoon(); } };
  const goToChildren = async ()=>{ const kids=getChildrenIds(currentId); showDebug(`Children of ${currentId}: ${kids.length?kids.join(', '):'—'}`);
    if(kids.length) { highlightGrid('down'); await goToId(kids[0],'down'); } else { showNotFound('—', false); clearMsgSoon(); } };
  const goToSiblings = async ()=>{ const sibs=getSiblingsIds(currentId); showDebug(`Siblings of ${currentId}: ${sibs.length?sibs.join(', '):'—'}`);
    if(sibs.length){ const s=sibs.slice().sort((a,b)=>a-b); const prev=s.filter(x=>x<currentId).pop(); highlightGrid('left'); await goToId(prev ?? s[0],'left'); } else { showNotFound('—', false); clearMsgSoon(); } };
  const goToSpouse = async ()=>{ showDebug(`Spouse of ${currentId}`); highlightGrid('right');
    const src = await loadImageForId(currentId, {spouse:true}); if (src) await animateSwap('right', src, currentId); else { showNotFound(currentId, true); clearMsgSoon(); } };
  const goBack = async ()=>{ const prev=historyStack.pop(); if(!prev) return; const src = await loadImageForId(prev);
    if (!src) { showNotFound(prev, false); clearMsgSoon(); return; } highlightGrid('up'); await animateSwap('up', src, prev); currentId=prev; };

  // Drag tracking with axis lock (prevents down->left misfires)
  let sx=0, sy=0, st=0, dragging=false, lockedAxis=null;
  const MIN_DIST=40, MAX_TIME=700;
  const RESIST=0.85;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const computeDir = (dx, dy) => {
    const ax=Math.abs(dx), ay=Math.abs(dy);
    const BIAS=1.2; // require 20% more movement to switch axis
    if (lockedAxis === 'x' || (ax > ay*BIAS && ax > MIN_DIST)) return dx>0 ? 'right' : 'left';
    if (lockedAxis === 'y' || (ay > ax*BIAS && ay > MIN_DIST)) return dy<0 ? 'up' : 'down';
    return ax>ay ? (dx>0?'right':'left') : (dy<0?'up':'down');
  };

  const onStart = (x, y) => { dragging=true; sx=x; sy=y; st=performance.now(); lockedAxis=null; img.classList.add('img-dragging'); stage.classList.add('dragging'); };
  const onMove  = (x, y) => {
    if(!dragging) return;
    const dx=(x-sx)*RESIST, dy=(y-sy)*RESIST;
    if (!lockedAxis) { // lock axis once user passes 24px strongly one way
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
    else if (dir==='right')await goToSpouse();
    else if (dir==='up')   await goToParent();
    else                   await goToChildren();
  };

  // Touch
  stage.addEventListener('touchstart', e=>{ const t=e.changedTouches[0]; onStart(t.clientX,t.clientY); }, {passive:true});
  stage.addEventListener('touchmove',  e=>{ if (e.cancelable) e.preventDefault(); const t=e.changedTouches[0]; onMove(t.clientX,t.clientY); }, {passive:false});
  stage.addEventListener('touchend',   e=>{ const t=e.changedTouches[0]; onEnd(t.clientX,t.clientY); }, {passive:true});
  // Mouse
  let mouseDown=false;
  stage.addEventListener('mousedown', e=>{ mouseDown=true; onStart(e.clientX,e.clientY); });
  stage.addEventListener('mousemove', e=>{ if(mouseDown) onMove(e.clientX,e.clientY); });
  stage.addEventListener('mouseup',   e=>{ if(mouseDown) onEnd(e.clientX,e.clientY); mouseDown=false; });
  stage.addEventListener('mouseleave',()=>{ mouseDown=false; dragging=false; lockedAxis=null; img.classList.remove('img-dragging'); stage.classList.remove('dragging'); img.style.transform=''; img.style.opacity=''; clearGrid(); });

  // Start
  const startWithId = async (id) => {
    const src = await loadImageForId(id);
    if (!src) { showNotFound(id, false); return; }
    img.classList.add('img-anim');
    img.src = src; img.alt = String(id);
    historyStack.length = 0;
    currentId = id;
    clearMsgSoon(800);
  };
  floater.addEventListener('click', () => {
    const raw = prompt('Enter starting ID (e.g., 140000):', localStorage.getItem('lastStartId') || '');
    const id = parseId(raw);
    if (id==null) return;
    localStorage.setItem('lastStartId', String(id));
    startWithId(id);
  });
  const urlStartId = parseId(q.get('id'));
  if (urlStartId != null) { localStorage.setItem('lastStartId', String(urlStartId)); startWithId(urlStartId); }
  else { floater.click(); }
})();