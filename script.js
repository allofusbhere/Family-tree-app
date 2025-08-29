/* SwipeTree v132c — full system with spouse tracing & corrected math
   - Spouse tracing from spouse_link.json (array-of-pairs OR object map), cache-busted
   - Children: 10^(tz-1) step  • Siblings: parent's children minus self  • Parent: zero at 10^(tz+1)
   - iPad scroll lock  • Overlay tiles auto-hide on 404  • Back closes grid, then history
*/
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

  const labels = new Map();         // Soft labels via long-press
  const spouses = new Map();        // Two-way spouse links
  const historyStack = [];          // Back behavior
  let currentId = null;

  // Utils
  function pow10(n){ return Math.pow(10, n); }
  function trailingZerosCount(idStr){
    const main = String(idStr).split('.')[0];
    let count = 0;
    for (let i = main.length - 1; i >= 0; i--) {
      if (main[i] === '0') count++; else break;
    }
    return count;
  }
  function imgUrlForId(id){ return IMAGE_BASE + String(id) + '.jpg'; }

  // spouse_link.json loader (supports array-of-pairs or object map)
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
        for (const [a,b] of Object.entries(data)){
          spouses.set(String(a), String(b));
        }
      }
    }catch(e){
      console.warn('spouse_link.json not loaded', e);
    }
  }

  // URL hash helpers
  function getIdFromHash(){
    const m = location.hash.match(/id=([0-9.]+)/);
    return m ? m[1] : null;
  }
  function setIdInHash(id){
    const newHash = `#id=${id}`;
    if (location.hash !== newHash){
      history.pushState({id}, '', newHash);
    }
  }

  // Relationship derivations
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
    for (let n=1; n<=MAX_COUNT; n++){
      list.push(String(base + n*step));
    }
    return list;
  }

  function deriveSiblings(idStr){
    const parent = deriveParent(idStr);
    if (!parent) return [];
    const ptz = trailingZerosCount(parent);
    if (ptz < 1) return [];
    const step = pow10(ptz - 1); // parent's children step
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
    const ex = spouses.get(String(idStr));
    if (ex) return ex;
    if (String(idStr).includes('.1')) return String(idStr).split('.')[0];
    return String(idStr)+'.1';
  }

  // UI loading
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
    img.onerror = () => { div.style.display = 'none'; }; // hide if image missing
    div.appendChild(img);
    div.addEventListener('click', () => { historyStack.push(currentId); loadAnchor(id); });
    return div;
  }

  // Gestures
  let touching=false, sx=0, sy=0;
  const THRESH = 32;

  stage.addEventListener('touchstart', (e)=>{
    if (!e.changedTouches || !e.changedTouches[0]) return;
    touching = true; sx = e.changedTouches[0].clientX; sy = e.changedTouches[0].clientY;
  }, {passive:false});

  stage.addEventListener('touchmove', (e)=>{ e.preventDefault(); }, {passive:false}); // lock page scroll

  stage.addEventListener('touchend', (e)=>{
    if (!touching || !e.changedTouches || !e.changedTouches[0]) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    touching = false;
    if (ax < THRESH && ay < THRESH) return;

    if (ax > ay){
      if (dx > 0){ historyStack.push(currentId); loadAnchor(resolveSpouseId(currentId)); }
      else { openOverlay(); }
    } else {
      if (dy < 0){ openOverlay(); }
      else { openOverlay(); }
    }
  }, {passive:false});

  // Mouse (desktop) swipe support
  let mStart=null;
  stage.addEventListener('mousedown', e => { mStart = {x:e.clientX,y:e.clientY}; });
  stage.addEventListener('mouseup', e => {
    if (!mStart) return;
    const dx = e.clientX - mStart.x, dy = e.clientY - mStart.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    mStart = null;
    if (ax < THRESH && ay < THRESH) return;
    if (ax > ay){
      if (dx > 0){ historyStack.push(currentId); loadAnchor(resolveSpouseId(currentId)); }
      else { openOverlay(); }
    } else {
      if (dy < 0){ openOverlay(); }
      else { openOverlay(); }
    }
  });

  // Back
  backBtn.addEventListener('click', () => {
    if (!overlay.classList.contains('hidden')){
      overlay.classList.add('hidden');
      return;
    }
    const prev = historyStack.pop();
    if (prev) loadAnchor(prev);
  });

  // Start
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
    const id = getIdFromHash() || '100000';
    loadAnchor(id);
  })();
})();