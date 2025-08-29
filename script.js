/* SwipeTree script.js — reads spouse_link.json as array-of-pairs (also supports object map) */
(function(){
  'use strict';

  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const MAX_GENERATION_COUNT = 9;
  const stage = document.getElementById('stage');
  const anchorEl = document.getElementById('anchor');
  const overlay = document.getElementById('overlay');
  const backBtn = document.getElementById('backBtn');
  const startForm = document.getElementById('startForm');
  const startIdInput = document.getElementById('startId');
  const labelName = document.getElementById('labelName');

  const labels = new Map();
  const spouses = new Map(); // two-way map

  async function loadSpouseMap(){
    try {
      const url = 'spouse_link.json?v=' + Date.now(); // cache-bust GitHub Pages
      const res = await fetch(url, {cache: 'no-store'});
      if (!res.ok) return;
      const data = await res.json();

      if (Array.isArray(data)) {
        for (const pair of data) {
          if (Array.isArray(pair) && pair.length >= 2) {
            const a = String(pair[0]), b = String(pair[1]);
            spouses.set(a, b);
            spouses.set(b, a);
          }
        }
      } else if (data && typeof data === 'object') {
        for (const [a,b] of Object.entries(data)) {
          spouses.set(String(a), String(b));
        }
      }
    } catch (e) {
      console.warn('spouse_link.json not found or invalid', e);
    }
  }

  const historyStack = [];

  function getIdFromHash(){
    const m = location.hash.match(/id=([0-9.]+)/);
    if (m) return m[1];
    return null;
  }
  function setIdInHash(id){
    const newHash = `#id=${id}`;
    if (location.hash !== newHash) {
      history.pushState({id}, '', newHash);
    }
  }
  function imgUrlForId(id){ return IMAGE_BASE + String(id) + '.jpg'; }

  function trailingZerosCount(idStr){
    const main = String(idStr).split('.')[0];
    let count = 0;
    for (let i = main.length - 1; i >= 0; i--) {
      if (main[i] === '0') count++; else break;
    }
    return count;
  }
  function pow10(n){ return Math.pow(10, n); }

  function deriveChildren(idStr){
    const tz = trailingZerosCount(idStr);
    const step = pow10(Math.max(0, tz)); // e.g., 140000 -> 10^3 = 1000
    const base = parseInt(idStr.split('.')[0], 10);
    if (tz < 1) return [];
    const out = [];
    for (let n=1; n<=MAX_GENERATION_COUNT; n++){
      out.push(String(base + n*step));
    }
    return out;
  }
  function deriveSiblings(idStr){
    const tz = trailingZerosCount(idStr);
    const step = pow10(tz + 1); // e.g., 140000 -> 10^4 = 10000
    const base = parseInt(idStr.split('.')[0], 10);
    const head = Math.floor(base / step) * step;
    const out = [];
    for (let n=1; n<=MAX_GENERATION_COUNT; n++){
      const sib = head + n*step;
      if (sib !== base) out.push(String(sib));
    }
    return out;
  }
  function deriveParent(idStr){
    const tz = trailingZerosCount(idStr);
    const step = pow10(tz + 1);
    const base = parseInt(idStr.split('.')[0], 10);
    const head = Math.floor(base / step) * step;
    if (head === base) return null;
    return String(head);
  }

  function resolveSpouseId(idStr){
    const explicit = spouses.get(String(idStr));
    if (explicit) return explicit;
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

  function openOverlay(direction){
    overlay.innerHTML = '';
    overlay.classList.remove('hidden');

    const tiles = {
      up: deriveParent(currentId),
      left: deriveSiblings(currentId),
      right: resolveSpouseId(currentId),
      down: deriveChildren(currentId)
    };

    if (tiles.up) overlay.appendChild(tileEl('up', tiles.up));
    if (Array.isArray(tiles.left) && tiles.left.length) overlay.appendChild(tileEl('left', tiles.left[0]));
    if (tiles.right) overlay.appendChild(tileEl('right', tiles.right));
    if (Array.isArray(tiles.down) && tiles.down.length) overlay.appendChild(tileEl('down', tiles.down[0]));
  }

  function tileEl(area, id){
    const div = document.createElement('div');
    div.className = `tile ${area}`;
    const img = document.createElement('img');
    img.alt = area;
    img.src = imgUrlForId(id);
    img.dataset.id = id;
    div.appendChild(img);
    div.addEventListener('click', () => {
      historyStack.push(currentId);
      loadAnchor(id);
    });
    return div;
  }

  let touchX=0, touchY=0, touching=false;
  const SWIPE_MIN = 32;

  function onTouchStart(ev){
    if (!ev.changedTouches || !ev.changedTouches[0]) return;
    touching = true;
    touchX = ev.changedTouches[0].clientX;
    touchY = ev.changedTouches[0].clientY;
  }
  function onTouchMove(ev){ ev.preventDefault(); }
  function onTouchEnd(ev){
    if (!touching || !ev.changedTouches || !ev.changedTouches[0]) return;
    const dx = ev.changedTouches[0].clientX - touchX;
    const dy = ev.changedTouches[0].clientY - touchY;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    touching = false;
    if (ax < SWIPE_MIN && ay < SWIPE_MIN) return;

    if (ax > ay){
      if (dx > 0){ historyStack.push(currentId); loadAnchor(resolveSpouseId(currentId)); }
      else { openOverlay('left'); }
    } else {
      if (dy < 0){ openOverlay('up'); }
      else { openOverlay('down'); }
    }
  }

  backBtn.addEventListener('click', () => {
    if (overlay && !overlay.classList.contains('hidden')) {
      overlay.classList.add('hidden');
      return;
    }
    const prev = historyStack.pop();
    if (prev) loadAnchor(prev);
  });

  let lpTimer=null;
  anchorEl.addEventListener('touchstart', () => {
    clearTimeout(lpTimer);
    lpTimer = setTimeout(() => {
      const name = prompt('Label for ' + currentId + ':', labels.get(currentId) || '');
      if (name !== null) {
        labels.set(currentId, name.trim());
        labelName.textContent = labels.get(currentId);
      }
    }, 600);
  });
  anchorEl.addEventListener('touchend', () => clearTimeout(lpTimer));

  let mStart=null;
  stage.addEventListener('mousedown', e => { mStart = {x:e.clientX,y:e.clientY}; });
  stage.addEventListener('mouseup', e => {
    if (!mStart) return;
    const dx = e.clientX - mStart.x, dy = e.clientY - mStart.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    mStart = null;
    if (ax < SWIPE_MIN && ay < SWIPE_MIN) return;
    if (ax > ay){
      if (dx > 0){ historyStack.push(currentId); loadAnchor(resolveSpouseId(currentId)); }
      else { openOverlay('left'); }
    } else {
      if (dy < 0){ openOverlay('up'); }
      else { openOverlay('down'); }
    }
  });

  stage.addEventListener('touchstart', onTouchStart, {passive:false});
  stage.addEventListener('touchmove', onTouchMove, {passive:false});
  stage.addEventListener('touchend', onTouchEnd, {passive:false});

  startForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const v = (startIdInput.value||'').trim();
    if (!v) return;
    historyStack.length = 0;
    loadAnchor(v);
  });

  window.addEventListener('popstate', (e)=>{
    const id = getIdFromHash();
    if (id) loadAnchor(id);
  });

  let currentId = null;
  (async function init(){
    await loadSpouseMap();
    currentId = getIdFromHash() || '100000';
    loadAnchor(currentId);
  })();
})();