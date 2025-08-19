// SwipeTree — labels fix + centered parents + SoftEdit overlay + iOS long-press suppression + optional names.json
(function(){
  'use strict';
  const params = new URLSearchParams(location.search);
  const DEFAULT_IMG_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const IMG_BASE = (window.SWIPE_TREE_IMG_BASE || params.get('imgbase') || DEFAULT_IMG_BASE).replace(/\/?$/, '/');
  const IMG_EXT = '.jpg';
  const PLACEHOLDER_NAME = 'placeholder.jpg';
  const PLACEHOLDER = IMG_BASE + PLACEHOLDER_NAME;
  const MAX_CANDIDATES = 9, SWIPE_THRESHOLD = 40, LONGPRESS_MS = 520;

  const state = { anchorId:null, historyStack:[], gridOpen:false, gridType:null, touchStart:null, longPressTimer:null, namesMap:{} };

  const anchorImg = document.getElementById('anchorImg');
  const anchorWrap = document.getElementById('anchorWrap');
  const anchorName = document.getElementById('anchorName');
  const gridOverlay = document.getElementById('gridOverlay');
  const grid = document.getElementById('grid');
  const gridTitle = document.getElementById('gridTitle');
  const backBtn = document.getElementById('backBtn');

  const editOverlay = document.getElementById('editOverlay');
  const editName = document.getElementById('editName');
  const editDob = document.getElementById('editDob');
  const editCancel = document.getElementById('editCancel');
  const editSave = document.getElementById('editSave');

  function idToSrc(id){ return IMG_BASE + id + IMG_EXT; }
  function exists(src){ return new Promise(r=>{ const i=new Image(); i.onload=()=>r(true); i.onerror=()=>r(false); i.src=src+cacheBust(); }); }
  const cacheBust = ()=> `?v=${Date.now()%1e7}`;
  function getSavedMeta(id){ try{ return JSON.parse(localStorage.getItem(`swipetree.meta.${id}`)||'null'); }catch{return null;} }
  function saveMeta(id, meta){ localStorage.setItem(`swipetree.meta.${id}`, JSON.stringify(meta||{})); }
  function displayNameFor(id){ if(state.namesMap[id]) return state.namesMap[id]; const m=getSavedMeta(id); return m&&m.name?m.name:''; }
  function setURLHash(id){ try{ history.replaceState(null,'',`#${encodeURIComponent(id)}`); }catch{} }

  function getIdParts(idStr){ const p=idStr.split('.'); return { baseId:p[0], isSpouse:(p[1]==='1'), partnerHint:(p[2]||null) }; }
  function countTrailingZeros(s){ let c=0; for(let i=s.length-1;i>=0;i--){ if(s[i]!=='0') break; c++; } return c; }
  const toInt = s=>parseInt(s,10);
  function toStr(n,d){ let s=String(n); while(s.length<d) s='0'+s; return s; }

  function parentOf(idStr){
    const {baseId}=getIdParts(idStr); const d=baseId.length; const tz=countTrailingZeros(baseId);
    if(tz<=0) return null; const n=toInt(baseId); const step=Math.pow(10,tz); const parent=n-(n%(step*10)); return toStr(parent,d);
  }
  function childrenOf(idStr){
    const {baseId}=getIdParts(idStr); const d=baseId.length; const tz=countTrailingZeros(baseId);
    const childStep=Math.pow(10, Math.max(0,tz-1)); const floor=toInt(baseId) - (toInt(baseId) % (childStep*10));
    const out=[]; for(let k=1;k<=MAX_CANDIDATES;k++) out.push(toStr(floor+k*childStep,d)); return out;
  }
  function siblingsOf(idStr){
    const {baseId}=getIdParts(idStr); const d=baseId.length; const tz=countTrailingZeros(baseId);
    const sibStep=Math.pow(10,tz); const floor=toInt(baseId) - (toInt(baseId) % (sibStep*10));
    const out=[]; for(let k=1;k<=MAX_CANDIDATES;k++){ const s=toStr(floor+k*sibStep,d); if(s!==baseId) out.push(s); } return out;
  }

  async function tryLoadNamesMap(){
    try{
      const res = await fetch(IMG_BASE + 'names.json' + cacheBust());
      if(res.ok){ const data = await res.json(); if(data && typeof data==='object') state.namesMap=data; }
    }catch{}
  }

  async function setAnchor(idStr, pushHistory=true){
    if(state.gridOpen) closeGrid();
    if(state.anchorId && pushHistory) state.historyStack.push(state.anchorId);
    state.anchorId=idStr; setURLHash(idStr);
    const src=idToSrc(idStr); const ok=await exists(src);
    anchorImg.src = ok ? (src+cacheBust()) : (PLACEHOLDER+cacheBust());
    anchorImg.classList.remove('highlight');
    anchorName.textContent = displayNameFor(idStr) || '';
    requestAnimationFrame(()=>{ anchorImg.classList.add('highlight'); setTimeout(()=>anchorImg.classList.remove('highlight'),350); });
  }

  function openGrid(title,cards,kind=null){
    gridTitle.textContent=title; grid.innerHTML=''; grid.classList.remove('parents'); if(kind==='parents') grid.classList.add('parents');
    cards.forEach(c=>{
      const tile=document.createElement('div'); tile.className='tile noselect'; tile.dataset.id=c.id;
      tile.innerHTML=`<img alt="${c.id}" src="${c.src}${cacheBust()}"><div class="label">${c.name||''}</div>`;
      tile.addEventListener('click', async ()=>{ closeGrid(); await setAnchor(c.id); });
      grid.appendChild(tile);
    });
    gridOverlay.classList.remove('hidden'); state.gridOpen=true;
  }
  function closeGrid(){ gridOverlay.classList.add('hidden'); state.gridOpen=false; state.gridType=null; }

  function onTouchStart(e){ if(state.longPressTimer) clearTimeout(state.longPressTimer);
    const t=e.touches?e.touches[0]:e; state.touchStart={x:t.clientX,y:t.clientY,time:Date.now()};
    state.longPressTimer=setTimeout(()=>{ openEdit(); }, LONGPRESS_MS);
  }
  function onTouchMove(e){ if(!state.touchStart) return; const t=e.touches?e.touches[0]:e;
    if(Math.abs(t.clientX-state.touchStart.x)>10||Math.abs(t.clientY-state.touchStart.y)>10) clearTimeout(state.longPressTimer);
  }
  function onTouchEnd(e){ if(state.longPressTimer) clearTimeout(state.longPressTimer); if(!state.touchStart) return;
    const t=e.changedTouches?e.changedTouches[0]:e; const dx=t.clientX-state.touchStart.x, dy=t.clientY-state.touchStart.y;
    const adx=Math.abs(dx), ady=Math.abs(dy); state.touchStart=null; if(adx<40 && ady<40) return;
    if(adx>ady){ if(dx>0) handleSpouseSwipe(); else handleSiblingsSwipe(); } else { if(dy>0) handleChildrenSwipe(); else handleParentsSwipe(); }
  }

  async function existingCards(ids){ const checks=await Promise.all(ids.map(id=>exists(idToSrc(id))));
    const out=[]; for(let i=0;i<ids.length;i++) if(checks[i]) out.push({id:ids[i], src:idToSrc(ids[i]), name:displayNameFor(ids[i])}); return out; }
  async function handleChildrenSwipe(){ openGrid('Children', await existingCards(childrenOf(state.anchorId)), 'children'); state.gridType='children'; }
  async function handleSiblingsSwipe(){ openGrid('Siblings', await existingCards(siblingsOf(state.anchorId)), 'siblings'); state.gridType='siblings'; }
  async function handleParentsSwipe(){ const p=parentOf(state.anchorId); const cards=[];
    if(p){ const ok=await exists(idToSrc(p)); cards.push({id:p, src: ok?idToSrc(p):PLACEHOLDER, name:displayNameFor(p)});
      const sp=p+'.1'; const ok2=await exists(idToSrc(sp)); cards.push(ok2?{id:sp, src:idToSrc(sp), name:displayNameFor(sp)}:{id:'Parent2', src:PLACEHOLDER, name:''}); }
    openGrid('Parents', cards, 'parents'); state.gridType='parents'; }
  async function handleSpouseSwipe(){ const p=getIdParts(state.anchorId); const t=p.isSpouse?p.baseId:p.baseId+'.1'; if(await exists(idToSrc(t))) await setAnchor(t); }

  backBtn.addEventListener('click', async ()=>{ if(state.gridOpen){ closeGrid(); return; } const prev=state.historyStack.pop(); if(prev) await setAnchor(prev,false); });

  // SoftEdit overlay (no browser prompt)
  function openEdit(){ const id=state.anchorId; const meta=getSavedMeta(id)||{}; editName.value = displayNameFor(id) || meta.name || ''; editDob.value = meta.dob || ''; editOverlay.classList.remove('hidden'); setTimeout(()=>editName.focus(),0); }
  function closeEdit(){ editOverlay.classList.add('hidden'); }
  editCancel.addEventListener('click', closeEdit);
  editOverlay.addEventListener('click', (e)=>{ if(e.target===editOverlay) closeEdit(); });
  editSave.addEventListener('click', ()=>{ const id=state.anchorId; const meta=getSavedMeta(id)||{}; const name=editName.value.trim(); const dob=editDob.value.trim(); saveMeta(id,{...meta,name,dob}); anchorName.textContent=name||''; closeEdit(); });

  // Attach gestures to anchor
  ['touchstart','mousedown'].forEach(ev=>anchorWrap.addEventListener(ev,onTouchStart,{passive:true}));
  ['touchmove','mousemove'].forEach(ev=>anchorWrap.addEventListener(ev,onTouchMove,{passive:true}));
  ['touchend','mouseup','mouseleave'].forEach(ev=>anchorWrap.addEventListener(ev,onTouchEnd,{passive:true}));

  // Suppress OS context menu
  document.addEventListener('contextmenu', e=>e.preventDefault());

  // Disable native interactions when grid closed
  document.addEventListener('gesturestart', e=>e.preventDefault());
  document.addEventListener('gesturechange', e=>e.preventDefault());
  document.addEventListener('gestureend', e=>e.preventDefault());
  document.addEventListener('touchmove', e=>{ if(state.gridOpen===false) e.preventDefault(); }, {passive:false});

  (async function boot(){ await tryLoadNamesMap(); let start=decodeURIComponent((location.hash||'').replace(/^#/,'')).trim(); if(!start) start='100000'; await setAnchor(start,false); })();

})();