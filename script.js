/* SwipeTree v132c — full system with spouse tracing & corrected math */
(function(){
  'use strict';
  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const MAX_COUNT = 9;
  const stage = document.getElementById('stage');
  const anchorEl = document.getElementById('anchor');
  const overlay = document.getElementById('overlay');
  const backBtn = document.getElementById('backBtn');
  const startForm = document.getElementById('startForm');
  const startIdInput = document.getElementById('startId');
  const labelName = document.getElementById('labelName');
  const labels = new Map();
  const spouses = new Map();
  const historyStack = [];
  let currentId = null;

  function pow10(n){ return Math.pow(10, n); }
  function trailingZerosCount(idStr){
    const main = String(idStr).split('.')[0];
    let count = 0;
    for (let i = main.length - 1; i >= 0; i--) { if (main[i] === '0') count++; else break; }
    return count;
  }
  function imgUrlForId(id){ return IMAGE_BASE + String(id) + '.jpg'; }

  async function loadSpouseMap(){
    try{
      const res = await fetch('spouse_link.json?v=' + Date.now(), {cache:'no-store'});
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)){
        for (const pair of data){
          if (Array.isArray(pair) && pair.length >= 2){
            const a = String(pair[0]), b = String(pair[1]);
            spouses.set(a,b); spouses.set(b,a);
          }
        }
      }else if (data && typeof data === 'object'){
        for (const [a,b] of Object.entries(data)){ spouses.set(String(a), String(b)); }
      }
    }catch(e){ console.warn('spouse_link.json not loaded', e); }
  }

  function getIdFromHash(){ const m = location.hash.match(/id=([0-9.]+)/); return m ? m[1] : null; }
  function setIdInHash(id){ const newHash = `#id=${id}`; if (location.hash !== newHash){ history.pushState({id}, '', newHash); } }

  function deriveParent(idStr){
    const main = String(idStr).split('.')[0];
    const tz = trailingZerosCount(main);
    const step = pow10(tz + 1);
    const base = parseInt(main, 10);
    const head = Math.floor(base / step) * step;
    if (head === 0 || head === base) return null;
    return String(head);
  }
  function deriveChildren(idStr){
    const main = String(idStr).split('.')[0];
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
    const pbase = parseInt(String(parent).split('.')[0], 10);
    const me = parseInt(String(idStr).split('.')[0], 10);
    const list = [];
    for (let n=1; n<=MAX_COUNT; n++){
      const sib = pbase + n*step;
      if (sib !== me) list.push(String(sib));
    }
    return list;
  }
  function resolveSpouseId(idStr){
    const ex = spouses.get(String(idStr)); if (ex) return ex;
    if (String(idStr).includes('.1')) return String(idStr).split('.')[0];
    return String(idStr)+'.1';
  }

  async function loadAnchor(id){
    currentId = String(id);
    anchorEl.src = imgUrlForId(currentId);
    anchorEl.setAttribute('data-id', currentId);
    setIdInHash(currentId);
    overlay.classList.add('hidden');
    labelName.textContent = labels.get(currentId) || '';
  }

  function openOverlay(){
    overlay.innerHTML = '';
    overlay.classList.remove('hidden');
    const parent = deriveParent(currentId);
    const siblings = deriveSiblings(currentId);
    const spouse = resolveSpouseId(currentId);
    const children = deriveChildren(currentId);
    if (parent) overlay.appendChild(tileEl('up', parent));
    if (siblings.length) overlay.appendChild(tileEl('left', siblings[0]));
    if (spouse) overlay.appendChild(tileEl('right', spouse));
    if (children.length) overlay.appendChild(tileEl('down', children[0]));
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

  // Default gesture handling (for desktop and browsers that play nice)
  let mStart=null;
  stage.addEventListener('mousedown', e => { mStart = {x:e.clientX,y:e.clientY}; });
  stage.addEventListener('mouseup', e => {
    if (!mStart) return;
    const dx = e.clientX - mStart.x, dy = e.clientY - mStart.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    mStart = null;
    if (ax < 24 && ay < 24) return;
    if (ax > ay){
      if (dx > 0){ historyStack.push(currentId); loadAnchor(resolveSpouseId(currentId)); }
      else { openOverlay(); }
    } else {
      if (dy < 0){ openOverlay(); }
      else { openOverlay(); }
    }
  });

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

  (async function init(){
    await loadSpouseMap();
    const id = getIdFromHash() || '100000';
    loadAnchor(id);
  })();
})();