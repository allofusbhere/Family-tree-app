
// v9b-fixed — Calls existing Netlify function 'save-labels' (family-tree-swipe.netlify.app)
(function () {
  'use strict';

  const BUILD = window.BUILD_TAG || 'v9b-fixed';
  const IMAGES_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const IMAGE_EXT = '.jpg';

  const NETLIFY_BASE = 'https://family-tree-swipe.netlify.app';
  const LABELS_GET_URL = NETLIFY_BASE + '/.netlify/functions/save-labels?id=';
  const LABELS_SET_URL = NETLIFY_BASE + '/.netlify/functions/save-labels';

  const OVERRIDE_CONTAIN = new Set(['100000']); // Fred

  const $ = (sel) => document.querySelector(sel);
  const bind = (target, ev, fn, opts) => {
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.addEventListener(ev, fn, opts || false);
  };

  const state = { anchorId: null, history: [], namesCache: {} };

  const toInt = (id) => parseInt(String(id).split('.')[0], 10);
  const isSpouseId = (id) => String(id).includes('.1');
  const spouseOf = (id) => isSpouseId(id) ? String(id).replace('.1', '') : String(id) + '.1';
  const trailingZerosCount = (n) => { n = toInt(n); let c = 0; while (n % 10 === 0 && n !== 0){ n = Math.floor(n/10); c++; } return c; };
  const magSibling = (n) => Math.pow(10, trailingZerosCount(n));
  const magChildren = (n) => Math.pow(10, Math.max(0, trailingZerosCount(n) - 1));
  const parentOf = (n) => { n = toInt(n); const m = magSibling(n); const digit = Math.floor(n/m) % 10; return n - digit * m; };
  const siblingsOf = (n) => { n = toInt(n); const m = magSibling(n); const digit = Math.floor(n/m) % 10; const base = n - digit*m; const out=[]; for(let d=1; d<=9; d++){ const cand = base + d*m; if (cand!==n) out.push(String(cand)); } return out; };
  const childrenOf = (n) => { n = toInt(n); const m = magChildren(n); const out=[]; for(let d=1; d<=9; d++) out.push(String(n + d*m)); return out; };

  const idFromURL = () => { const m = location.hash.match(/id=([0-9.]+)/); if (m) return m[1]; const q = new URLSearchParams(location.search); if (q.get('id')) return q.get('id'); return null; };
  const imageURL = (id) => IMAGES_BASE + id + IMAGE_EXT + '?v=' + encodeURIComponent(BUILD);
  const pushHistory = (id) => { if (state.anchorId) state.history.push(state.anchorId); try{ history.replaceState({}, '', '#id=' + id); }catch{} };
  const navigateTo = (id) => { pushHistory(String(id)); loadAnchor(String(id)); };

  const localKey = (id) => `swipetree:label:${id}`;

  async function getLabelRemote(id){
    try{
      const r = await fetch(LABELS_GET_URL + encodeURIComponent(id), { cache:'no-store' });
      if (!r.ok) return null;
      const j = await r.json();
      return (j && (j.name || j.label)) || null;
    }catch{ return null; }
  }
  async function setLabelRemote(id, name){
    try{
      const r = await fetch(LABELS_SET_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id, name }),
      });
      return r.ok;
    }catch{ return false; }
  }
  async function loadLabel(id){
    const el = $('#anchorLabel');
    if (!el) return;
    if (state.namesCache[id]) { el.textContent = state.namesCache[id]; return; }
    const remote = await getLabelRemote(id);
    if (remote){ state.namesCache[id]=remote; el.textContent=remote; localStorage.setItem(localKey(id), remote); return; }
    const local = localStorage.getItem(localKey(id));
    el.textContent = local || '';
    if (local) state.namesCache[id]=local;
  }
  async function saveLabel(id, name){
    state.namesCache[id]=name;
    localStorage.setItem(localKey(id), name || '');
    await setLabelRemote(id, name || '');
    const el=$('#anchorLabel'); if(el) el.textContent = name || '';
  }

  const clearGrid = () => { const g = $('#grid'); if (g) g.innerHTML=''; };
  const showOverlay = (title) => { const ov=$('#gridOverlay'); if(ov){ $('#overlayTitle').textContent=title||''; ov.classList.remove('hidden'); } };
  const hideOverlay = () => { const ov=$('#gridOverlay'); if(ov) ov.classList.add('hidden'); };

  function applyFitMode(imgEl, id){
    if (!imgEl) return;
    if (OVERRIDE_CONTAIN.has(String(id))) imgEl.classList.add('contain');
    else imgEl.classList.remove('contain');
  }

  const renderTile = (container, id) => {
    const tile = document.createElement('div');
    tile.className='tile'; tile.dataset.id=id;
    tile.innerHTML = `<div class="tid">${id}</div><img alt="person"/><div class="name"></div>`;
    const img = tile.querySelector('img');
    applyFitMode(img, id);
    img.src = imageURL(id);
    img.addEventListener('error', ()=> tile.remove(), {once:true});
    tile.addEventListener('click', ()=>{ navigateTo(id); hideOverlay(); });
    container.appendChild(tile);
  };
  const renderGrid = (title, ids) => { clearGrid(); showOverlay(title); const grid=$('#grid'); if(!grid) return; [...new Set(ids)].forEach(id=>renderTile(grid,id)); };

  async function loadAnchor(id){
    state.anchorId = String(id);
    const idEl=$('#anchorId'); if(idEl) idEl.textContent = state.anchorId;
    const img=$('#anchorImg'); if(img){ applyFitMode(img, id); img.src=imageURL(id); img.removeAttribute('hidden'); }
    await loadLabel(id);
  }

  function attachSwipe(el){
    if (!el) return;
    let sx=0, sy=0, active=false; const TH=30;
    el.addEventListener('touchstart', e=>{ const t=e.changedTouches[0]; sx=t.clientX; sy=t.clientY; active=true; }, {passive:true});
    el.addEventListener('touchend', e=>{
      if(!active) return; active=false;
      const t=e.changedTouches[0]; const dx=t.clientX-sx, dy=t.clientY-sy;
      if (Math.abs(dx)<TH && Math.abs(dy)<TH) return;
      if (Math.abs(dx)>Math.abs(dy)){ if (dx>0) onSwipeRight(); else onSwipeLeft(); }
      else { if (dy>0) onSwipeDown(); else onSwipeUp(); }
    }, {passive:true});
  }
  function onSwipeRight(){ if (isSpouseId(state.anchorId)) { navigateTo(spouseOf(state.anchorId)); return; } renderGrid('Spouse', [spouseOf(state.anchorId)]); }
  function onSwipeLeft(){ renderGrid('Siblings', siblingsOf(state.anchorId)); }
  function onSwipeDown(){ renderGrid('Children', childrenOf(state.anchorId)); }
  function onSwipeUp(){ const p=parentOf(state.anchorId); const list=[]; if(p&&p!==0){ list.push(String(p)); list.push(spouseOf(String(p))); } renderGrid('Parents', list); }

  function longPress(el, fn, ms=520){ let t=null; const start=()=>{ cancel(); t=setTimeout(fn,ms); }; const cancel=()=>{ if(t){clearTimeout(t); t=null;} }; el.addEventListener('touchstart', start, {passive:true}); el.addEventListener('touchend', cancel, {passive:true}); el.addEventListener('mousedown', start); el.addEventListener('mouseup', cancel); el.addEventListener('mouseleave', cancel); }

  function init(){
    bind('#closeOverlay','click', hideOverlay);
    bind('#backBtn','click', ()=>{ const ov=$('#gridOverlay'); if(ov && !ov.classList.contains('hidden')){ hideOverlay(); return; } const prev=state.history.pop(); if(prev) loadAnchor(prev); });
    bind('#startBtn','click', ()=>{ const input=prompt('Enter starting ID', state.anchorId||'100000'); if(input) navigateTo(String(input)); });

    longPress($('#anchorCard'), async ()=>{
      const id = state.anchorId;
      const current = state.namesCache[id] || localStorage.getItem(localKey(id)) || '';
      const name = window.prompt('Edit label (name):', current);
      if (name===null) return;
      await saveLabel(id, name);
    });

    attachSwipe($('#anchorCard'));

    const id = idFromURL() || '100000';
    state.anchorId = String(id);
    loadAnchor(state.anchorId);
  }
  document.addEventListener('DOMContentLoaded', init);
})();
