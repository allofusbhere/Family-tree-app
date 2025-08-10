/* SwipeTree — forced Start prompt + floating Start button fallback */
(() => {
  const img = document.getElementById('anchorImg');
  const debugEl = document.getElementById('debug');
  const buildEl = document.getElementById('buildTag');
  const floater = document.getElementById('startFloater');

  // Build tag
  const t = new Date();
  const pad = n => String(n).padStart(2,'0');
  buildEl.textContent = `build ${t.getFullYear()}${pad(t.getMonth()+1)}${pad(t.getDate())}-${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;

  // Config
  const IMAGE_BASE = "";
  const EXT_VARIANTS = [".jpg",".JPG",".jpeg",".JPEG",".png",".PNG",".webp",".WEBP"];

  // State
  let currentId = null;
  let historyStack = [];

  // Utils
  const showDebug = (msg) => {
    debugEl.textContent = msg;
    debugEl.style.opacity = '1';
    clearTimeout(showDebug._t);
    showDebug._t = setTimeout(() => (debugEl.style.opacity = '0'), 1000);
  };

  const parseId = (raw) => {
    const s = String(raw || "").trim();
    const first = s.split('.')[0];
    const n = Number(first);
    return Number.isFinite(n) ? n : null;
  };

  const q = new URLSearchParams(location.search);
  const urlStartId = parseId(q.get('id'));

  const loadImageForId = (id, {spouse=false}={}) => new Promise((resolve,reject)=>{
    const base = spouse ? `${id}.1` : `${id}`;
    let i = 0;
    const tryNext = () => {
      if (i >= EXT_VARIANTS.length) return reject(new Error('not found'));
      const src = IMAGE_BASE + base + EXT_VARIANTS[i++];
      const test = new Image();
      test.onload = () => resolve(src);
      test.onerror = tryNext;
      test.draggable = false;
      test.src = src;
    };
    tryNext();
  });

  const setAnchorImage = async (id, dir=null, preferSpouse=false) => {
    if (dir) {
      img.classList.remove('swipe-in-left','swipe-in-right','swipe-in-up','swipe-in-down');
      img.classList.add(`swipe-out-${dir}`);
    }
    try {
      const src = await loadImageForId(id, {spouse:preferSpouse});
      setTimeout(() => {
        img.src = src;
        img.alt = String(id);
        const inClass = {left:'right', right:'left', up:'down', down:'up'}[dir] || 'down';
        requestAnimationFrame(()=>{
          img.classList.remove('swipe-out-left','swipe-out-right','swipe-out-up','swipe-out-down');
          img.classList.add(`swipe-in-${inClass}`);
          setTimeout(()=>img.classList.remove('swipe-in-left','swipe-in-right','swipe-in-up','swipe-in-down'), 300);
        });
      }, dir ? 60 : 0);
    } catch(e) {
      if (preferSpouse) {
        try {
          const fb = await loadImageForId(id, {spouse:false});
          img.src = fb; img.alt = String(id);
        } catch { img.removeAttribute('src'); }
      } else {
        img.removeAttribute('src');
      }
    }
  };

  // Relationship math
  const PLACES = [10000,1000,100,10,1];
  const highestNonZeroPlace = (id) => { for (const p of PLACES) { const d=Math.floor(id/p)%10; if (d>0) return p; } return null; };
  const nextLowerPlace = (p) => { const i=PLACES.indexOf(p); return (i<0||i===PLACES.length-1)?null:PLACES[i+1]; };
  const getParentId = (id) => { for (const p of PLACES){ const d=Math.floor(id/p)%10; if(d>0) return id - d*p; } return null; };
  const getChildrenIds = (id) => { const top=highestNonZeroPlace(id); const step=nextLowerPlace(top); if(!step) return []; const out=[]; for(let n=1;n<=9;n++) out.push(id+n*step); return out; };
  const getSiblingsIds = (id) => { const parent=getParentId(id); if(!parent) return []; const top=highestNonZeroPlace(parent)??0; const step=nextLowerPlace(top); if(!step) return []; const res=[]; for(let n=1;n<=9;n++){ const c=parent+n*step; if(c!==id) res.push(c);} return res; };

  // Navigation
  const goToId = async (nextId, dir, opts={}) => {
    if (!nextId || nextId===currentId) return;
    historyStack.push(currentId);
    currentId = nextId;
    await setAnchorImage(currentId, dir, !!opts.preferSpouseVariant);
  };
  const goToParent = async ()=>{ const p=getParentId(currentId); showDebug(`Parent of ${currentId}: ${p??'—'}`); if(p) await goToId(p,'up'); };
  const goToChildren = async ()=>{ const kids=getChildrenIds(currentId); showDebug(`Children of ${currentId}: ${kids.length?kids.join(', '):'—'}`); if(kids.length) await goToId(kids[0],'down'); };
  const goToSiblings = async ()=>{ const sibs=getSiblingsIds(currentId); showDebug(`Siblings of ${currentId}: ${sibs.length?sibs.join(', '):'—'}`); if(sibs.length){ const s=sibs.slice().sort((a,b)=>a-b); const prev=s.filter(x=>x<currentId).pop(); await goToId(prev ?? s[0],'left'); } };
  const goToSpouse = async ()=>{ showDebug(`Spouse of ${currentId}`); await setAnchorImage(currentId,'right',true); };
  const goBack = async ()=>{ const prev=historyStack.pop(); if(!prev) return; currentId=prev; await setAnchorImage(currentId,'up'); showDebug(`Back → ${currentId}`); };

  // Buttons
  document.getElementById('btnParent').addEventListener('click', goToParent);
  document.getElementById('btnKids').addEventListener('click', goToChildren);
  document.getElementById('btnSibs').addEventListener('click', goToSiblings);
  document.getElementById('btnSpouse').addEventListener('click', goToSpouse);
  document.getElementById('btnBack').addEventListener('click', goBack);

  // Swipes
  let sx=0, sy=0, st=0; const MIN_DIST=40, MAX_TIME=700;
  const onStart = (e)=>{ const t=e.changedTouches[0]; sx=t.clientX; sy=t.clientY; st=performance.now(); };
  const onMove  = (e)=>{ if (e.cancelable) e.preventDefault(); };
  const onEnd   = async(e)=>{ const t=e.changedTouches[0]; const dx=t.clientX-sx, dy=t.clientY-sy, dt=performance.now()-st; const ax=Math.abs(dx), ay=Math.abs(dy); if(dt>MAX_TIME) return; if(ax<MIN_DIST && ay<MIN_DIST) return; if(ax>ay){ if(dx>0) await goToSpouse(); else await goToSiblings(); } else { if(dy<0) await goToParent(); else await goToChildren(); } };
  const stage = document.getElementById('stage');
  stage.addEventListener('touchstart', onStart, {passive:true});
  stage.addEventListener('touchmove',  onMove,  {passive:false});
  stage.addEventListener('touchend',   onEnd,   {passive:true});

  // Start flow with guaranteed prompt/fallback
  const forcePrompt = () => {
    const raw = prompt('Enter starting ID (e.g., 140000):', localStorage.getItem('lastStartId') || '');
    const id = parseId(raw);
    if (id == null) { floater.style.display = 'block'; return; }
    localStorage.setItem('lastStartId', String(id));
    startWithId(id);
  };

  const startWithId = (id) => {
    currentId = id;
    historyStack.length = 0;
    floater.style.display = 'none';
    setAnchorImage(currentId, null);
  };

  // Floater always available
  floater.addEventListener('click', forcePrompt);

  // Boot rules:
  // 1) ?id=... wins
  // 2) Otherwise prompt once
  if (urlStartId != null) {
    localStorage.setItem('lastStartId', String(urlStartId));
    startWithId(urlStartId);
  } else {
    forcePrompt();
  }
})();