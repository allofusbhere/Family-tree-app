// SwipeTree — iPad test build (images from family-tree-images repo)
(function(){
  'use strict';
  const params = new URLSearchParams(location.search);
  const DEFAULT_IMG_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const IMG_BASE = (window.SWIPE_TREE_IMG_BASE || params.get('imgbase') || DEFAULT_IMG_BASE).replace(/\/?$/, '/');
  const IMG_EXT = '.jpg';
  const PLACEHOLDER_NAME = 'placeholder.jpg';
  const PLACEHOLDER = IMG_BASE + PLACEHOLDER_NAME;
  const MAX_CANDIDATES = 9;
  const SWIPE_THRESHOLD = 40;
  const LONGPRESS_MS = 520;

  const state = { anchorId:null, historyStack:[], gridOpen:false, gridType:null, touchStart:null, longPressTimer:null };

  const anchorImg = document.getElementById('anchorImg');
  const anchorWrap = document.getElementById('anchorWrap');
  const anchorName = document.getElementById('anchorName');
  const gridOverlay = document.getElementById('gridOverlay');
  const grid = document.getElementById('grid');
  const gridTitle = document.getElementById('gridTitle');
  const backBtn = document.getElementById('backBtn');

  function idToSrc(id){ return IMG_BASE + id + IMG_EXT; }
  function exists(src){
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src + cacheBust();
    });
  }
  function cacheBust(){ return `?v=${Date.now() % 1e7}`; }
  function getSavedMeta(id){
    const key = `swipetree.meta.${id}`;
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }
  function saveMeta(id, meta){ localStorage.setItem(`swipetree.meta.${id}`, JSON.stringify(meta||{})); }
  function displayNameFor(id){ const m=getSavedMeta(id); return (m&&m.name)?m.name:''; }
  function setURLHash(id){ try{ history.replaceState(null,'',`#${encodeURIComponent(id)}`); }catch{} }

  function getIdParts(idStr){
    const parts=idStr.split('.'); let base=parts[0]; let isSpouse=false; let partnerHint=null;
    if(parts.length>=2 && parts[1]==='1') isSpouse=true;
    if(parts.length>=3) partnerHint=parts[2];
    return { baseId:base, isSpouse, partnerHint };
  }
  function countTrailingZeros(s){ let c=0; for(let i=s.length-1;i>=0;i--){ if(s[i]!=='0') break; c++; } return c; }
  const toInt = s => parseInt(s,10);
  function toStr(n,d){ let s=String(n); while(s.length<d) s='0'+s; return s; }

  function parentOf(idStr){
    const {baseId}=getIdParts(idStr); const d=baseId.length; const tz=countTrailingZeros(baseId);
    if(tz<=0) return null;
    const n=toInt(baseId); const step=Math.pow(10,tz); const parent=n-(n%(step*10));
    return toStr(parent,d);
  }
  function childrenOf(idStr){
    const {baseId}=getIdParts(idStr); const d=baseId.length; const tz=countTrailingZeros(baseId);
    const childStep=Math.pow(10, Math.max(0,tz-1));
    const parentFloor=toInt(baseId) - (toInt(baseId) % (childStep*10));
    const out=[]; for(let k=1;k<=9;k++){ const kid=parentFloor+k*childStep; out.push(toStr(kid,d)); }
    return out;
  }
  function siblingsOf(idStr){
    const {baseId}=getIdParts(idStr); const d=baseId.length; const tz=countTrailingZeros(baseId);
    const sibStep=Math.pow(10,tz);
    const parentFloor=toInt(baseId) - (toInt(baseId) % (sibStep*10));
    const out=[]; for(let k=1;k<=9;k++){ const sib=parentFloor+k*sibStep; const s=toStr(sib,d); if(s!==baseId) out.push(s); }
    return out;
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

  function openGrid(title,cards){
    gridTitle.textContent=title; grid.innerHTML='';
    cards.forEach(c=>{
      const el=document.createElement('div'); el.className='tile noselect'; el.dataset.id=c.id;
      el.innerHTML=`<img alt="${c.id}" src="${c.src}${cacheBust()}"><div class="label">${c.name||''}</div>`;
      el.addEventListener('click', async ()=>{ closeGrid(); await setAnchor(c.id); });
      grid.appendChild(el);
    });
    gridOverlay.classList.remove('hidden'); state.gridOpen=true;
  }
  function closeGrid(){ gridOverlay.classList.add('hidden'); state.gridOpen=false; state.gridType=null; }

  function onTouchStart(e){
    if(state.longPressTimer) clearTimeout(state.longPressTimer);
    const t=e.touches?e.touches[0]:e; state.touchStart={x:t.clientX,y:t.clientY,time:Date.now()};
    state.longPressTimer=setTimeout(()=>{ maybeEditAnchor(); }, LONGPRESS_MS);
  }
  function onTouchMove(e){
    if(!state.touchStart) return;
    const t=e.touches?e.touches[0]:e;
    if(Math.abs(t.clientX-state.touchStart.x)>10 || Math.abs(t.clientY-state.touchStart.y)>10) clearTimeout(state.longPressTimer);
  }
  function onTouchEnd(e){
    if(state.longPressTimer) clearTimeout(state.longPressTimer);
    if(!state.touchStart) return; const t=e.changedTouches?e.changedTouches[0]:e;
    const dx=t.clientX-state.touchStart.x, dy=t.clientY-state.touchStart.y;
    const adx=Math.abs(dx), ady=Math.abs(dy); state.touchStart=null;
    if(adx<SWIPE_THRESHOLD && ady<SWIPE_THRESHOLD) return;
    if(adx>ady){ if(dx>0) handleSpouseSwipe(); else handleSiblingsSwipe(); }
    else { if(dy>0) handleChildrenSwipe(); else handleParentsSwipe(); }
  }

  async function existingCards(ids){
    const checks=await Promise.all(ids.map(id=>exists(idToSrc(id))));
    const out=[]; for(let i=0;i<ids.length;i++){ if(checks[i]) out.push({id:ids[i], src:idToSrc(ids[i]), name:displayNameFor(ids[i])}); }
    return out;
  }
  async function handleChildrenSwipe(){ openGrid('Children', await existingCards(childrenOf(state.anchorId))); state.gridType='children'; }
  async function handleSiblingsSwipe(){ openGrid('Siblings', await existingCards(siblingsOf(state.anchorId))); state.gridType='siblings'; }
  async function handleParentsSwipe(){
    const p=parentOf(state.anchorId); const cards=[];
    if(p){ const ok=await exists(idToSrc(p)); cards.push({id:p, src: ok?idToSrc(p):PLACEHOLDER, name:displayNameFor(p)});
      const sp=p+'.1'; const ok2=await exists(idToSrc(sp));
      cards.push(ok2?{id:sp, src:idToSrc(sp), name:displayNameFor(sp)}:{id:'Parent2', src:PLACEHOLDER, name:''});
    }
    openGrid('Parents', cards);
    state.gridType='parents';
  }
  async function handleSpouseSwipe(){
    const {baseId,isSpouse}=getIdParts(state.anchorId);
    const target=isSpouse?baseId:baseId+'.1';
    if(await exists(idToSrc(target))) await setAnchor(target);
  }

  backBtn.addEventListener('click', async ()=>{
    if(state.gridOpen){ closeGrid(); return; }
    const prev=state.historyStack.pop(); if(prev) await setAnchor(prev,false);
  });

  function maybeEditAnchor(){
    const id=state.anchorId; const meta=getSavedMeta(id)||{};
    const name=(prompt("Edit first name (optional):", meta.name||"") ?? meta.name) || "";
    const dob=(prompt("Edit DOB (optional):", meta.dob||"") ?? meta.dob) || "";
    saveMeta(id,{name,dob}); anchorName.textContent=name||'';
  }

  ['touchstart','mousedown'].forEach(ev=>anchorWrap.addEventListener(ev,onTouchStart,{passive:true}));
  ['touchmove','mousemove'].forEach(ev=>anchorWrap.addEventListener(ev,onTouchMove,{passive:true}));
  ['touchend','mouseup','mouseleave'].forEach(ev=>anchorWrap.addEventListener(ev,onTouchEnd,{passive:true}));

  document.addEventListener('gesturestart', e=>e.preventDefault());
  document.addEventListener('gesturechange', e=>e.preventDefault());
  document.addEventListener('gestureend', e=>e.preventDefault());
  document.addEventListener('touchmove', e=>{ if(state.gridOpen===false) e.preventDefault(); }, {passive:false});

  (async function boot(){
    let start=decodeURIComponent((location.hash||'').replace(/^#/,'')).trim();
    if(!start) start='100000';
    await setAnchor(start,false);
  })();
})();