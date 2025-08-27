(function(){
  'use strict';

  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const IMG_EXT = '.jpg';
  const MAX_HISTORY = 50;

  const $ = (sel, root=document) => root.querySelector(sel);

  function init(){
    const anchorEl = $('#anchor');
    const idInput = $('#idInput');
    const startBtn = $('#startBtn');
    const backBtn  = $('#backBtn');
    const statusEl = $('#status');

    if(!anchorEl || !idInput || !startBtn || !backBtn){
      console.error('SwipeTree: missing core DOM nodes');
      return;
    }
    console.log('SwipeTree init');

    const state = {
      anchorId: null,
      historyStack: []
    };

    function imgUrl(id){ return IMAGE_BASE + String(id) + IMG_EXT; }
    function setHash(id){ try { history.replaceState(null, '', `#id=${encodeURIComponent(id)}`); } catch {} }
    function getHashId(){
      const m = location.hash.match(/[#&]id=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    }
    function showStatus(msg){ if(statusEl) statusEl.textContent = msg; }

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
      showStatus(`Loading ${id}…`);
      anchorEl.innerHTML = '';
      const img = new Image();
      img.alt = `ID ${id}`;
      img.className = 'anchor-img';
      img.onload = () => {
        anchorEl.innerHTML = '';
        anchorEl.appendChild(img);
        showStatus(`Showing ${id}`);
      };
      img.onerror = () => {
        const msg = document.createElement('div');
        msg.className = 'missing';
        msg.textContent = `Image not found for ${id}`;
        anchorEl.innerHTML = '';
        anchorEl.appendChild(msg);
        showStatus(`Missing image for ${id}`);
      };
      img.referrerPolicy = 'no-referrer';
      img.src = imgUrl(id);
    }

    function startFromInput(){
      const raw = idInput.value.trim();
      if(!/^\d+(?:\.\d+)?$/.test(raw)){
        showStatus('Enter a numeric ID like 100000');
        return;
      }
      const id = raw;
      if(state.anchorId) pushHistory(state.anchorId);
      renderAnchor(id);
    }

    function startFromHash(){
      const h = getHashId();
      if(h){
        idInput.value = h;
        renderAnchor(h);
      }else{
        showStatus('Ready. Enter an ID.');
      }
    }

    function onBack(){
      const prev = popHistory();
      if(prev) renderAnchor(prev);
    }

    // Wire up
    startBtn.addEventListener('click', startFromInput);
    backBtn.addEventListener('click', onBack);
    idInput.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){ startFromInput(); }
    });

    // Kick off
    startFromHash();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();