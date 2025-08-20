(function(){
  'use strict';

  // Images live in the separate repo:
  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  // Try these extensions in order (case sensitive on GitHub Pages).
  const EXTS = ['.jpg','.jpeg','.png','.webp','.JPG','.JPEG','.PNG','.WEBP'];

  // ---- DOM ----
  const inputEl   = document.getElementById('idInput');
  const statusEl  = document.getElementById('status');
  const container = document.getElementById('image-container');

  const historyStack = [];

  function setStatus(msg){ if(statusEl) statusEl.textContent = msg; }

  function showPlaceholder(id){
    if (!container) return;
    container.innerHTML = '<div class="placeholder">No image found for ' + String(id) + '</div>';
  }

  function renderImage(url, id){
    if (!container) return;
    container.innerHTML = '';
    const img = document.createElement('img');
    img.alt = 'ID ' + String(id);
    img.src = url;
    container.appendChild(img);
  }

  function loadWithExts(id, done){
    let i = 0;
    const probe = new Image();
    const tryNext = () => {
      if (i >= EXTS.length){ done(null); return; }
      const url = IMAGE_BASE + String(id) + EXTS[i] + '?v=' + Date.now();
      probe.onload  = () => done(url);
      probe.onerror = () => { i++; tryNext(); };
      probe.src = url;
    };
    tryNext();
  }

  function loadPerson(id){
    const clean = String(id||'').trim();
    if (!clean){ setStatus('Enter an ID'); showPlaceholder('—'); return; }

    setStatus('Loaded ID: ' + clean);
    if (historyStack[historyStack.length-1] !== clean){
      historyStack.push(clean);
    }

    // Try to find an image file in the images repo.
    loadWithExts(clean, function(foundUrl){
      if (foundUrl){ renderImage(foundUrl, clean); }
      else { showPlaceholder(clean); }
    });
  }

  // Expose the two button handlers expected by your HTML
  window.start = function(){
    loadPerson(inputEl && inputEl.value);
  };

  window.goBack = function(){
    if (historyStack.length > 1){
      historyStack.pop(); // current
      const prev = historyStack.pop(); // previous
      if (prev){
        if (inputEl) inputEl.value = prev;
        loadPerson(prev);
      }
    }
  };

  // Enter key support
  if (inputEl){
    inputEl.addEventListener('keydown', function(e){
      if (e.key === 'Enter'){ e.preventDefault(); window.start(); }
    });
  }

  // Support query param ?id=140000
  try {
    const params = new URLSearchParams(location.search);
    const qid = params.get('id');
    if (qid){
      if (inputEl) inputEl.value = qid;
      loadPerson(qid);
    }
  } catch {}
})();