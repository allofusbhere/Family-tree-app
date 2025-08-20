(function(){
  'use strict';

  // --- CONFIG: images live in separate repo ---
  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const EXTS = ['.jpg','.jpeg','.png','.webp','.JPG','.JPEG','.PNG','.WEBP'];

  const statusEl = document.getElementById('status');
  const inputEl = document.getElementById('idInput');
  const container = document.getElementById('image-container');

  const historyStack = [];

  function setStatus(msg){ statusEl.textContent = msg; }

  function showPlaceholder(id){
    container.innerHTML = '<div class="placeholder">No image for ' + id + '</div>';
  }

  function renderImage(url, id){
    container.innerHTML = '';
    const img = document.createElement('img');
    img.alt = 'ID ' + id;
    img.src = url;
    container.appendChild(img);

    // Debug helper: show which URL was used (small, subtle)
    const small = document.createElement('div');
    small.style.fontSize = '12px';
    small.style.opacity = '0.6';
    small.style.marginTop = '6px';
    small.textContent = url;
    container.appendChild(small);
    console.log('[SwipeTree] loaded:', url);
  }

  function tryExtensions(id){
    return new Promise((resolve) => {
      let idx = 0;
      function next(){
        if(idx >= EXTS.length){ resolve(null); return; }
        const url = IMAGE_BASE + String(id) + EXTS[idx] + '?v=' + Date.now();
        const probe = new Image();
        probe.onload = () => resolve(url);
        probe.onerror = () => { idx++; next(); };
        probe.src = url;
        console.log('[SwipeTree] trying', url);
      }
      next();
    });
  }

  async function loadPerson(id){
    const clean = String(id || '').trim();
    if(!clean){ setStatus('Enter an ID'); return; }

    setStatus('Loaded ID: ' + clean);

    if(historyStack.length === 0 || historyStack[historyStack.length-1] !== clean){
      historyStack.push(clean);
    }

    const found = await tryExtensions(clean);
    if(found){ renderImage(found, clean); }
    else { showPlaceholder(clean); }
  }

  // Expose for buttons
  window.start = function(){
    loadPerson(inputEl.value);
  };
  window.goBack = function(){
    if(historyStack.length > 1){
      historyStack.pop();
      const prev = historyStack.pop();
      if(prev){ inputEl.value = prev; loadPerson(prev); }
    }
  };

  // Enter key support
  inputEl.addEventListener('keydown', e => {
    if(e.key === 'Enter'){ e.preventDefault(); window.start(); }
  });

  // Auto-load via ?id=
  const q = new URLSearchParams(location.search);
  const qid = q.get('id');
  if(qid){
    inputEl.value = qid;
    loadPerson(qid);
  }
})();