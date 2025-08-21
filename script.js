
// SwipeTree v6 — Parents grid shows both parents (p and p.1) and centers the grid
(function () {
  'use strict';

  const BUILD = (window.BUILD_TAG || 'v6');
  const IMAGES_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const IMAGE_EXT = '.jpg';

  const LABELS_GET_URL = '';
  const LABELS_SET_URL = '';

  const $ = (sel) => document.querySelector(sel);
  const on = (sel, ev, fn, opts) => {
    const el = typeof sel === 'string' ? $(sel) : sel;
    if (el) el.addEventListener(ev, fn, opts || false);
  };

  const state = { anchorId:null, history:[], longPressTimer:null, longPressMs:520, namesCache:{} };

  function idFromURL() {
    const m = location.hash.match(/id=([0-9.]+)/);
    if (m) return m[1];
    const q = new URLSearchParams(location.search);
    if (q.get('id')) return q.get('id');
    return null;
  }
  function pushHistory(id){ if(state.anchorId) state.history.push(state.anchorId); try{history.replaceState({},'',`#id=${id}`);}catch{} }

  function imageURL(id){ return IMAGES_BASE + id + IMAGE_EXT + '?v=' + encodeURIComponent(BUILD); }
  function toInt(id){ return parseInt(String(id).split('.')[0], 10); }
  function isSpouseId(id){ return String(id).includes('.1'); }
  function spouseOf(id){ return isSpouseId(id) ? String(id).replace('.1','') : String(id)+'.1'; }

  function trailingZerosCount(n){
    n = toInt(n);
    let c=0;
    while(n%10===0 && n!==0){ n=Math.floor(n/10); c++;}
    return c;
  }
  function magSibling(n){ const tz=trailingZerosCount(n); return Math.pow(10, tz); }
  function magChildren(n){ const tz=trailingZerosCount(n); return Math.pow(10, Math.max(0, tz-1)); }
  function parentOf(n){
    n = toInt(n);
    const magS = magSibling(n);
    const digit = Math.floor(n/magS)%10;
    return n - digit*magS; // may return 0 at top
  }
  function siblingsOf(n){
    n = toInt(n);
    const magS = magSibling(n);
    const digit = Math.floor(n/magS)%10;
    const base = n - digit*magS;
    const arr=[];
    for(let d=1; d<=9; d++){
      const cand = base + d*magS;
      if (cand!==n) arr.push(String(cand));
    }
    return arr;
  }
  function childrenOf(n){
    n = toInt(n);
    const magC = magChildren(n);
    const arr=[];
    for(let d=1; d<=9; d++) arr.push(String(n + d*magC));
    return arr;
  }

  function unique(arr){ return [...new Set(arr)]; }

  function setLabel(id,name){ state.namesCache[id]=name; const lab=$('#anchorLabel'); if(lab) lab.textContent=name||''; }
  async function loadLabel(id){
    const lab=$('#anchorLabel'); if(!lab) return;
    if(state.namesCache[id]){ lab.textContent=state.namesCache[id]; return; }
    lab.textContent = '';
  }

  function clearGrid(){ const g=$('#grid'); if(g) g.innerHTML=''; }
  function showOverlay(title){ const ov=$('#gridOverlay'); if(!ov) return; $('#overlayTitle').textContent=title||''; ov.classList.remove('hidden'); }
  function hideOverlay(){ const ov=$('#gridOverlay'); if(!ov) return; ov.classList.add('hidden'); }

  function renderTile(container, id){
    const tile = document.createElement('div');
    tile.className='tile'; tile.dataset.id=id;
    tile.innerHTML = `<div class="tid">${id}</div><img alt="person"/><div class="name"></div>`;
    const img = tile.querySelector('img');
    img.src = imageURL(id);
    img.addEventListener('error', ()=> tile.remove(), {once:true}); // suppress if image missing
    tile.addEventListener('click', ()=>{ navigateTo(id); hideOverlay(); });
    container.appendChild(tile);
  }
  function renderGrid(title, ids){ clearGrid(); showOverlay(title); const grid=$('#grid'); if(!grid) return; unique(ids).forEach(id=>renderTile(grid,id)); }

  async function loadAnchor(id){
    state.anchorId = String(id);
    const idEl=$('#anchorId'); if(idEl) idEl.textContent = state.anchorId;
    const img=$('#anchorImg'); if(img){ img.src = imageURL(state.anchorId); img.removeAttribute('hidden'); }
    await loadLabel(state.anchorId);
  }
  function navigateTo(id){ pushHistory(String(id)); loadAnchor(String(id)); }

  function attachSwipe(el){
    if (!el) return;
    let sx=0,sy=0,active=false; const TH=30;
    el.addEventListener('touchstart', e=>{const t=e.changedTouches[0]; sx=t.clientX; sy=t.clientY; active=true; }, {passive:true});
    el.addEventListener('touchend', e=>{
      if(!active) return; active=false;
      const t=e.changedTouches[0]; const dx=t.clientX-sx; const dy=t.clientY-sy;
      if (Math.abs(dx)<TH && Math.abs(dy)<TH) return;
      if (Math.abs(dx)>Math.abs(dy)){
        if (dx>0) onSwipeRight(); else onSwipeLeft();
      } else {
        if (dy>0) onSwipeDown(); else onSwipeUp();
      }
    }, {passive:true});
  }

  // === Swipe behaviors ===
  function onSwipeRight(){
    if (isSpouseId(state.anchorId)) { navigateTo(spouseOf(state.anchorId)); return; }
    renderGrid('Spouse', [spouseOf(state.anchorId)]);
  }
  function onSwipeLeft(){ renderGrid('Siblings', siblingsOf(state.anchorId)); }
  function onSwipeDown(){ renderGrid('Children', childrenOf(state.anchorId)); }
  function onSwipeUp(){
    const p = parentOf(state.anchorId);
    const list = [];
    if (p && p !== 0) {
      list.push(String(p));
      list.push(spouseOf(String(p))); // show other parent (p.1)
    }
    renderGrid('Parents', list);
  }

  function attachLongPressEdit(el, getId){
    if (!el) return;
    const start = ()=>{
      cancel();
      state.longPressTimer = setTimeout(async ()=>{
        const id = getId();
        const current = state.namesCache[id] || '';
        const name = window.prompt('Edit label (name):', current);
        if (name===null) return;
        setLabel(id,name);
      }, state.longPressMs);
    };
    const cancel = ()=>{ if(state.longPressTimer){ clearTimeout(state.longPressTimer); state.longPressTimer=null; } };
    el.addEventListener('touchstart', start, {passive:true});
    el.addEventListener('touchend', cancel, {passive:true});
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
  }

  function init(){
    on('#closeOverlay','click', hideOverlay);
    on('#backBtn','click', ()=>{
      const ov=$('#gridOverlay');
      if (ov && !ov.classList.contains('hidden')){ hideOverlay(); return; }
      const prev = state.history.pop(); if(prev) loadAnchor(prev);
    });
    on('#startBtn','click', ()=>{
      const input = prompt('Enter starting ID', state.anchorId || '100000');
      if (input) navigateTo(String(input));
    });

    attachSwipe($('#anchorCard'));
    attachLongPressEdit($('#anchorCard'), ()=>state.anchorId);

    const id = idFromURL() || '100000';
    state.anchorId = String(id);
    loadAnchor(state.anchorId);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
