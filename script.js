/* SwipeTree v133 — pointer-based swipes, JSON spouses, both-parents centered */
(function(){
  'use strict';

  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const MAX_COUNT = 9;

  // Elements
  const stage = document.getElementById('stage');
  const anchorEl = document.getElementById('anchor');
  const overlay = document.getElementById('overlay');
  const backBtn = document.getElementById('backBtn');
  const startForm = document.getElementById('startForm');
  const startIdInput = document.getElementById('startId');
  const labelName = document.getElementById('labelName');

  // State
  const labels = new Map();
  const spouses = new Map();
  const historyStack = [];
  let currentId = null;

  // ---------- Utilities ----------
  function pow10(n){ return Math.pow(10, n); }
  function trailingZerosCount(idStr){
    const main = String(idStr).split('.')[0];
    let count = 0;
    for (let i = main.length - 1; i >= 0; i--) { if (main[i] === '0') count++; else break; }
    return count;
  }
  function imgUrlForId(id){ return IMAGE_BASE + String(id) + '.jpg'; }
  function idMain(id){ return String(id).split('.')[0]; }

  // ---------- Spouse map (array-of-pairs or object) ----------
  async function loadSpouseMap(){
    try{
      const res = await fetch('spouse_link.json?v=' + Date.now(), {cache:'no-store'});
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)){
        for (const pair of data) if (Array.isArray(pair) && pair.length >= 2){
          const a=String(pair[0]), b=String(pair[1]); spouses.set(a,b); spouses.set(b,a);
        }
      } else if (data && typeof data === 'object'){
        for (const [a,b] of Object.entries(data)){ spouses.set(String(a), String(b)); }
      }
    }catch(e){ console.warn('spouse_link.json not loaded', e); }
  }

  // ---------- Derivations ----------
  function deriveParent(idStr){
    const main = idMain(idStr);
    const tz = trailingZerosCount(main);
    const step = pow10(tz + 1);
    const base = parseInt(main, 10);
    const head = Math.floor(base / step) * step;
    if (head === 0 || head === base) return null;
    return String(head);
  }
  function deriveChildren(idStr){
    const main = idMain(idStr);
    const tz = trailingZerosCount(main);
    if (tz < 1) return [];
    const step = pow10(tz - 1);
    const base = parseInt(main, 10);
    const list = [];
    for (let n=1; n<=MAX_COUNT; n++){ list.push(String(base + n*step)); }
    return list;
  }
  function deriveSiblings(idStr){
    const parent = deriveParent(idStr);
    if (!parent) return [];
    const ptz = trailingZerosCount(parent);
    if (ptz < 1) return [];
    const step = pow10(ptz - 1);
    const pbase = parseInt(idMain(parent), 10);
    const me = parseInt(idMain(idStr), 10);
    const out = [];
    for (let n=1; n<=MAX_COUNT; n++){
      const sib = pbase + n*step;
      if (sib !== me) out.push(String(sib));
    }
    return out;
  }
  function resolveSpouseId(idStr){
    const ex = spouses.get(String(idStr));
    if (ex) return ex;
    if (String(idStr).includes('.1')) return idMain(idStr);
    return String(idStr)+'.1';
  }
  function resolveOtherParent(parentId){
    // Use spouse map if available; else try .1
    const m = spouses.get(String(parentId));
    if (m) return m;
    if (!String(parentId).includes('.1')) return String(parentId)+'.1';
    return idMain(parentId);
  }

  // ---------- UI ----------
  async function loadAnchor(id){
    currentId = String(id);
    anchorEl.src = imgUrlForId(currentId);
    anchorEl.setAttribute('data-id', currentId);
    setIdInHash(currentId);
    overlay.classList.add('hidden');
    labelName.textContent = labels.get(currentId) || '';
  }

  function setIdInHash(id){
    const newHash = `#id=${id}`;
    if (location.hash !== newHash) history.pushState({id}, '', newHash);
  }
  function getIdFromHash(){
    const m = location.hash.match(/id=([0-9.]+)/);
    return m ? m[1] : null;
  }

  function openOverlay(){
    overlay.innerHTML = '';
    overlay.classList.remove('hidden');

    const parentA = deriveParent(currentId);
    const parentB = parentA ? resolveOtherParent(parentA) : null;
    const siblings = deriveSiblings(currentId);
    const spouse = resolveSpouseId(currentId);
    const children = deriveChildren(currentId);

    // Up: both parents centered
    if (parentA){
      const up = document.createElement('div');
      up.className = 'tile up';
      const p1 = mkParent(parentA);
      up.appendChild(p1);
      if (parentB){
        const p2 = mkParent(parentB);
        up.appendChild(p2);
      }
      overlay.appendChild(up);
    }

    if (siblings.length) overlay.appendChild(tileEl('left', siblings[0]));
    if (spouse) overlay.appendChild(tileEl('right', spouse));
    if (children.length) overlay.appendChild(tileEl('down', children[0]));
  }

  function mkParent(id){
    const d = document.createElement('div');
    d.className = 'parent';
    const img = document.createElement('img');
    img.src = imgUrlForId(id);
    img.alt = 'parent';
    img.onerror = () => { d.style.display = 'none'; };
    d.appendChild(img);
    d.addEventListener('click', ()=>{ historyStack.push(currentId); loadAnchor(id); });
    return d;
  }

  function tileEl(area, id){
    const div = document.createElement('div');
    div.className = `tile ${area}`;
    const img = document.createElement('img');
    img.alt = area;
    img.src = imgUrlForId(id);
    img.dataset.id = id;
    img.onerror = () => { div.style.display = 'none'; };
    div.appendChild(img);
    div.addEventListener('click', () => { historyStack.push(currentId); loadAnchor(id); });
    return div;
  }

  // ---------- Gestures (Pointer Events with touch/mouse fallback) ----------
  let startX=0, startY=0, active=false;
  const THRESH = 24;

  function onStart(x,y){ active=true; startX=x; startY=y; }
  function onMove(ev){ if (ev.cancelable) ev.preventDefault(); }
  function onEnd(x,y){
    if (!active) return;
    active=false;
    const dx = x - startX, dy = y - startY;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax < THRESH && ay < THRESH) return;

    if (ax > ay){
      if (dx > 0){ historyStack.push(currentId); loadAnchor(resolveSpouseId(currentId)); }
      else { openOverlay(); } // siblings shown in overlay
    } else {
      if (dy < 0){ openOverlay(); }  // parents (both centered)
      else { openOverlay(); }        // children
    }
  }

  // Pointer events preferred
  if (window.PointerEvent){
    const opts = {passive:false, capture:true};
    stage.addEventListener('pointerdown', (e)=>onStart(e.clientX, e.clientY), opts);
    stage.addEventListener('pointermove', onMove, opts);
    stage.addEventListener('pointerup',   (e)=>onEnd(e.clientX, e.clientY), opts);
    anchorEl.addEventListener('pointerdown', (e)=>onStart(e.clientX, e.clientY), opts);
    anchorEl.addEventListener('pointermove', onMove, opts);
    anchorEl.addEventListener('pointerup',   (e)=>onEnd(e.clientX, e.clientY), opts);
  } else {
    // Touch fallback
    const opts = {passive:false, capture:true};
    stage.addEventListener('touchstart', (e)=>{ const t=e.touches&&e.touches[0]; if(!t) return; onStart(t.clientX,t.clientY); if(e.cancelable) e.preventDefault(); }, opts);
    stage.addEventListener('touchmove', (e)=>onMove(e), opts);
    stage.addEventListener('touchend',  (e)=>{ const t=e.changedTouches&&e.changedTouches[0]; if(!t) return; onEnd(t.clientX,t.clientY); if(e.cancelable) e.preventDefault(); }, opts);
    anchorEl.addEventListener('touchstart', (e)=>{ const t=e.touches&&e.touches[0]; if(!t) return; onStart(t.clientX,t.clientY); if(e.cancelable) e.preventDefault(); }, opts);
    anchorEl.addEventListener('touchmove', (e)=>onMove(e), opts);
    anchorEl.addEventListener('touchend',  (e)=>{ const t=e.changedTouches&&e.changedTouches[0]; if(!t) return; onEnd(t.clientX,t.clientY); if(e.cancelable) e.preventDefault(); }, opts);
    // Mouse fallback
    let mStart=null;
    stage.addEventListener('mousedown', e=>{ mStart={x:e.clientX,y:e.clientY}; });
    stage.addEventListener('mouseup', e=>{ if(!mStart) return; onEnd(e.clientX,e.clientY); mStart=null; });
  }

  // Back & start
  backBtn.addEventListener('click', () => {
    if (!overlay.classList.contains('hidden')){ overlay.classList.add('hidden'); return; }
    const prev = historyStack.pop();
    if (prev) loadAnchor(prev);
  });
  startForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const v = (startIdInput.value||'').trim();
    if (!v) return;
    historyStack.length = 0;
    loadAnchor(v);
  });

  // Init
  (async function init(){
    await loadSpouseMap();
    loadAnchor(getIdFromHash() || '100000');
    window.addEventListener('popstate', ()=>{
      const id = getIdFromHash();
      if (id) loadAnchor(id);
    });
  })();
})();