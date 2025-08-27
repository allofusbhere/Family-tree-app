(function(){
  'use strict';

  // === Config ===
  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const IMG_EXT = '.jpg'; // all images are flat in the repo (no subfolders)
  const MAX_HISTORY = 50;

  // === State ===
  const state = {
    anchorId: null,
    historyStack: []
  };

  // === DOM ===
  const $ = (sel, root=document) => root.querySelector(sel);
  const anchorEl = $('#anchor');
  const idInput = $('#idInput');
  const startBtn = $('#startBtn');
  const backBtn = $('#backBtn');

  // === Utils ===
  function imgUrl(id) {
    return IMAGE_BASE + String(id) + IMG_EXT;
  }

  function setHash(id){
    try { history.replaceState(null, '', `#id=${encodeURIComponent(id)}`); } catch {}
  }

  function getHashId(){
    const m = location.hash.match(/[#&]id=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function pushHistory(id){
    if(state.anchorId && state.anchorId !== id){
      state.historyStack.push(state.anchorId);
      if(state.historyStack.length > MAX_HISTORY) state.historyStack.shift();
    }
    backBtn.hidden = state.historyStack.length === 0;
  }

  function popHistory(){
    const prev = state.historyStack.pop();
    backBtn.hidden = state.historyStack.length === 0;
    return prev || null;
  }

  function renderAnchor(id){
    state.anchorId = id;
    setHash(id);
    anchorEl.innerHTML = '';
    const img = new Image();
    img.alt = `ID ${id}`;
    img.className = 'anchor-img';
    img.onload = () => {
      anchorEl.innerHTML = '';
      anchorEl.appendChild(img);
    };
    img.onerror = () => {
      const msg = document.createElement('div');
      msg.className = 'missing';
      msg.textContent = `Image not found for ${id}`;
      anchorEl.innerHTML = '';
      anchorEl.appendChild(msg);
    };
    img.src = imgUrl(id);
  }

  // === Actions ===
  function startFromInput(){
    const raw = idInput.value.trim();
    if(!/^\d+(?:\.\d+)?$/.test(raw)) return; // numeric or spouse .1
    const id = raw;
    if(state.anchorId) pushHistory(state.anchorId);
    renderAnchor(id);
  }

  function startFromHash(){
    const h = getHashId();
    if(h){
      idInput.value = h;
      renderAnchor(h);
    }
  }

  function onBack(){
    const prev = popHistory();
    if(prev) renderAnchor(prev);
  }

  // === Init ===
  startBtn.addEventListener('click', startFromInput);
  backBtn.addEventListener('click', onBack);

  // Allow Enter to trigger Start
  idInput.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){ startFromInput(); }
  });

  // Launch
  startFromHash();
})();