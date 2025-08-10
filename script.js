/* SwipeTree — true directional drag with release animations (dynamic filenames) */
(() => {
  const img = document.getElementById('anchorImg');
  const stage = document.getElementById('stage');
  const debugEl = document.getElementById('debug');
  const buildEl = document.getElementById('buildTag');
  const floater = document.getElementById('startFloater');
  const notFoundEl = document.getElementById('notFound');

  // Build tag
  const t = new Date();
  const pad = n => String(n).padStart(2,'0');
  buildEl.textContent = `build ${t.getFullYear()}${pad(t.getMonth()+1)}${pad(t.getDate())}-${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;

  // Config: preconfigured image base (filenames are computed from ID)
  const DEFAULT_BASE = "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";
  const q = new URLSearchParams(location.search);
  const urlBase = q.get('base');
  const IMAGE_BASE = (urlBase && /\/$/.test(urlBase)) ? urlBase : DEFAULT_BASE;

  const EXT_VARIANTS = [".jpg",".JPG",".jpeg",".JPEG",".png",".PNG",".webp",".WEBP"];

  // State
  let currentId = null;
  let historyStack = [];

  // Utils
  const showDebug = (msg) => {
    debugEl.textContent = msg;
    debugEl.style.opacity = '1';
    clearTimeout(showDebug._t);
    showDebug._t = setTimeout(() => (debugEl.style.opacity = '0'), 1200);
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
      try { const ok = await tryFetch(url); return ok; }
      catch { /* keep trying */ }
    }
    return null;
  };

  const showNotFound = (id, spouse) => {
    notFoundEl.style.display = "block";
    notFoundEl.textContent = `Image not found for ID ${id}${spouse ? " (spouse)" : ""} at base:\n` + IMAGE_BASE;
  };
  const clearNotFound = () => { notFoundEl.style.display = "none"; notFoundEl.textContent = ""; };

  // Relationship math
  const PLACES = [10000,1000,100,10,1];
  const highestNonZeroPlace = (id) => { for (const p of PLACES) { const d=Math.floor(id/p)%10; if (d>0) return p; } return null; };
  const nextLowerPlace = (p) => { const i=PLACES.indexOf(p); return (i<0||i===PLACES.length-1)?null:PLACES[i+1]; };
  const getParentId = (id) => { for (const p of PLACES){ const d=Math.floor(id/p)%10; if(d>0) return id - d*p; } return null; };
  const getChildrenIds = (id) => { const top=highestNonZeroPlace(id); const step=nextLowerPlace(top); if(!step) return []; const out=[]; for(let n=1;n<=9;n++) out.push(id+n*step); return out; };
  const getSiblingsIds = (id) => { const parent=getParentId(id); if(!parent) return []; const top=highestNonZeroPlace(parent)??0; const step=nextLowerPlace(top); if(!step) return []; const res=[]; for(let n=1;n<=9;n++){ const c=parent+n*step; if(c!==id) res.push(c);} return res; };

  // ===== Animated swap helpers =====
  const animateSwap = async (direction, nextSrc, nextId) => {
    // direction: 'left' | 'right' | 'up' | 'down'
    img.classList.add('img-anim');
    // 1) Exit current image toward swipe
    const exitClass = {
      left: 'exit-left', right: 'exit-right', up: 'exit-up', down: 'exit-down'
    }[direction];
    img.classList.add(exitClass);
    await new Promise(r => setTimeout(r, 260)); // match --anim-ms

    // 2) Swap source and place new image just off-screen on opposite side
    img.classList.remove(exitClass);
    const enterClass = {
      left: 'enter-right', right: 'enter-left', up: 'enter-down', down: 'enter-up'
    }[direction];
    img.classList.add(enterClass);
    img.src = nextSrc; img.alt = String(nextId);

    // 3) Animate into place
    void img.offsetWidth; // reflow
    img.classList.add('enter-done');
    await new Promise(r => setTimeout(r, 260));
    img.classList.remove('enter-right','enter-left','enter-up','enter-down','enter-done');
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
      clearNotFound();
      await animateSwap(dir, nextSrc, nextId);
    }
    historyStack.push(currentId);
    currentId = nextId;
  };

  const goToParent = async ()=>{ const p=getParentId(currentId); showDebug(`Parent of ${currentId}: ${p??'—'}`); if(p) await goToId(p,'up'); };
  const goToChildren = async ()=>{ const kids=getChildrenIds(currentId); showDebug(`Children of ${currentId}: ${kids.length?kids.join(', '):'—'}`); if(kids.length) await goToId(kids[0],'down'); };
  const goToSiblings = async ()=>{ const sibs=getSiblingsIds(currentId); showDebug(`Siblings of ${currentId}: ${sibs.length?sibs.join(', '):'—'}`); if(sibs.length){ const s=sibs.slice().sort((a,b)=>a-b); const prev=s.filter(x=>x<currentId).pop(); await goToId(prev ?? s[0],'left'); } };
  const goToSpouse = async ()=>{ showDebug(`Spouse of ${currentId}`); const src = await loadImageForId(currentId, {spouse:true}); if (src) await animateSwap('right', src, currentId); else showNotFound(currentId, true); };
  const goBack = async ()=>{ const prev=historyStack.pop(); if(!prev) return; const src = await loadImageForId(prev); if (!src) { showNotFound(prev, false); return; } await animateSwap('up', src, prev); currentId=prev; };

  // Buttons
  document.getElementById('btnParent').addEventListener('click', goToParent);
  document.getElementById('btnKids').addEventListener('click', goToChildren);
  document.getElementById('btnSibs').addEventListener('click', goToSiblings);
  document.getElementById('btnSpouse').addEventListener('click', goToSpouse);
  document.getElementById('btnBack').addEventListener('click', goBack);

  // ===== True drag tracking =====
  let sx=0, sy=0, st=0, dragging=false;
  const MIN_DIST=40, MAX_TIME=700;
  const RESIST=0.85; // feel of drag
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const onStart = (x, y) => {
    dragging=true; sx=x; sy=y; st=performance.now();
    img.classList.add('img-dragging');
  };
  const onMove = (x, y) => {
    if(!dragging) return;
    const dx=(x-sx)*RESIST, dy=(y-sy)*RESIST;
    img.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    img.style.opacity = String(clamp(1 - (Math.abs(dx)+Math.abs(dy))/800, .3, 1));
  };
  const onEnd = async (x, y) => {
    if(!dragging) return;
    dragging=false;
    img.classList.remove('img-dragging');
    img.style.transform=''; img.style.opacity='';

    const dx=x-sx, dy=y-sy, dt=performance.now()-st;
    const ax=Math.abs(dx), ay=Math.abs(dy);
    if (dt>MAX_TIME || (ax<MIN_DIST && ay<MIN_DIST)) return; // cancel

    if (ax>ay) {
      if (dx>0) await goToSpouse(); else await goToSiblings();
    } else {
      if (dy<0) await goToParent(); else await goToChildren();
    }
  };

  // Touch
  stage.addEventListener('touchstart', e=>{
    const t=e.changedTouches[0]; onStart(t.clientX,t.clientY);
  }, {passive:true});
  stage.addEventListener('touchmove', e=>{
    if (e.cancelable) e.preventDefault();
    const t=e.changedTouches[0]; onMove(t.clientX,t.clientY);
  }, {passive:false});
  stage.addEventListener('touchend', e=>{
    const t=e.changedTouches[0]; onEnd(t.clientX,t.clientY);
  }, {passive:true});

  // Mouse (desktop)
  let mouseDown=false;
  stage.addEventListener('mousedown', e=>{ mouseDown=true; onStart(e.clientX,e.clientY); });
  stage.addEventListener('mousemove', e=>{ if(mouseDown) onMove(e.clientX,e.clientY); });
  stage.addEventListener('mouseup',   e=>{ if(mouseDown) onEnd(e.clientX,e.clientY); mouseDown=false; });
  stage.addEventListener('mouseleave',()=>{ mouseDown=false; dragging=false; img.classList.remove('img-dragging'); img.style.transform=''; img.style.opacity=''; });

  // Start flow
  const startWithId = async (id) => {
    const src = await loadImageForId(id);
    if (!src) { showNotFound(id, false); return; }
    img.classList.add('img-anim');
    img.src = src; img.alt = String(id);
    historyStack.length = 0;
    currentId = id;
  };

  floater.addEventListener('click', () => {
    const raw = prompt('Enter starting ID (e.g., 140000):', localStorage.getItem('lastStartId') || '');
    const id = parseId(raw);
    if (id==null) return;
    localStorage.setItem('lastStartId', String(id));
    startWithId(id);
  });

  const urlStartId = parseId(q.get('id'));
  if (urlStartId != null) {
    localStorage.setItem('lastStartId', String(urlStartId));
    startWithId(urlStartId);
  } else {
    // Prompt once on load
    floater.click();
  }
})();