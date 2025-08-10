// SwipeTree with Start ID Bar and swipe/button navigation
(() => {
  const img = document.getElementById('anchorImg');
  const debugEl = document.getElementById('debug');
  const buildEl = document.getElementById('buildTag');

  const startBar = document.getElementById('startBar');
  const startInput = document.getElementById('startId');
  const startBtn = document.getElementById('startBtn');

  // Build tag
  const t = new Date();
  const pad = n => String(n).padStart(2,'0');
  buildEl.textContent = `build ${t.getFullYear()}${pad(t.getMonth()+1)}${pad(t.getDate())}-${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;

  const IMAGE_BASE = "";
  const EXT_VARIANTS = [".jpg",".JPG",".jpeg",".JPEG",".png",".PNG",".webp",".WEBP"];
  let currentId = null;
  let historyStack = [];

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
    try {
      const src = await loadImageForId(id, {spouse:preferSpouse});
      img.src = src;
      img.alt = String(id);
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

  const PLACES = [10000,1000,100,10,1];
  const highestNonZeroPlace = (id) => { for (const p of PLACES) { const d=Math.floor(id/p)%10; if (d>0) return p; } return null; };
  const nextLowerPlace = (p) => { const i=PLACES.indexOf(p); return (i<0||i===PLACES.length-1)?null:PLACES[i+1]; };
  const getParentId = (id) => { for (const p of PLACES){ const d=Math.floor(id/p)%10; if(d>0) return id - d*p; } return null; };
  const getChildrenIds = (id) => { const top=highestNonZeroPlace(id); const step=nextLowerPlace(top); if(!step) return []; const out=[]; for(let n=1;n<=9;n++) out.push(id+n*step); return out; };
  const getSiblingsIds = (id) => { const parent=getParentId(id); if(!parent) return []; const top=highestNonZeroPlace(parent)??0; const step=nextLowerPlace(top); if(!step) return []; const res=[]; for(let n=1;n<=9;n++){ const c=parent+n*step; if(c!==id) res.push(c);} return res; };

  const goToId = async (nextId) => {
    if (!nextId || nextId===currentId) return;
    historyStack.push(currentId);
    currentId = nextId;
    await setAnchorImage(currentId);
  };
  const goToParent = async ()=>{ const p=getParentId(currentId); if(p) await goToId(p); };
  const goToChildren = async ()=>{ const kids=getChildrenIds(currentId); if(kids.length) await goToId(kids[0]); };
  const goToSiblings = async ()=>{ const sibs=getSiblingsIds(currentId); if(sibs.length) await goToId(sibs[0]); };
  const goToSpouse = async ()=>{ await setAnchorImage(currentId,null,true); };
  const goBack = async ()=>{ const prev=historyStack.pop(); if(prev) { currentId=prev; await setAnchorImage(currentId); } };

  document.getElementById('btnParent').addEventListener('click', goToParent);
  document.getElementById('btnKids').addEventListener('click', goToChildren);
  document.getElementById('btnSibs').addEventListener('click', goToSiblings);
  document.getElementById('btnSpouse').addEventListener('click', goToSpouse);
  document.getElementById('btnBack').addEventListener('click', goBack);

  let sx=0, sy=0, st=0; const MIN_DIST=40, MAX_TIME=700;
  const onStart = (e)=>{ const t=e.changedTouches[0]; sx=t.clientX; sy=t.clientY; st=performance.now(); };
  const onMove  = (e)=>{ if (e.cancelable) e.preventDefault(); };
  const onEnd   = async(e)=>{ const t=e.changedTouches[0]; const dx=t.clientX-sx, dy=t.clientY-sy, dt=performance.now()-st; const ax=Math.abs(dx), ay=Math.abs(dy); if(dt>MAX_TIME) return; if(ax<MIN_DIST && ay<MIN_DIST) return; if(ax>ay){ if(dx>0) await goToSpouse(); else await goToSiblings(); } else { if(dy<0) await goToParent(); else await goToChildren(); } };
  const stage = document.getElementById('stage');
  stage.addEventListener('touchstart', onStart, {passive:true});
  stage.addEventListener('touchmove',  onMove,  {passive:false});
  stage.addEventListener('touchend',   onEnd,   {passive:true});

  const startWithId = (id) => {
    currentId = id;
    historyStack.length = 0;
    startBar.style.display = 'none';
    setAnchorImage(currentId);
  };

  startBtn.addEventListener('click', () => {
    const id = parseId(startInput.value);
    if (id==null) { startInput.focus(); startInput.select(); return; }
    startWithId(id);
  });
  startInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startBtn.click();
  });

  if (urlStartId != null) {
    startInput.value = urlStartId;
    startBtn.click();
  }
})();
