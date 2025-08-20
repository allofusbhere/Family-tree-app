(function(){
  'use strict';

  // Point to your image repo
  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const EXTS = ['.jpg','.jpeg','.png','.webp','.JPG','.JPEG','.PNG','.WEBP'];

  const statusEl = document.getElementById('status');
  const inputEl = document.getElementById('idInput');
  const container = document.getElementById('image-container');

  const historyStack = [];

  function setStatus(msg){ statusEl.textContent = msg; }

  function placeholder(id){
    container.innerHTML = '<div class="placeholder">No image for ' + id + '</div>';
  }

  function loadWithExtensions(id, cb){
    let i = 0;
    const img = new Image();
    function tryNext(){
      if(i >= EXTS.length){ cb(null); return; }
      const url = IMAGE_BASE + String(id) + EXTS[i] + '?v=' + Date.now();
      img.onload = () => cb(url);
      img.onerror = () => { i++; tryNext(); };
      img.src = url;
    }
    tryNext();
  }

  function renderImage(url, id){
    container.innerHTML = '';
    const imgTag = document.createElement('img');
    imgTag.alt = 'ID ' + id;
    imgTag.src = url;
    container.appendChild(imgTag);
  }

  function loadPerson(id){
    const clean = String(id || '').trim();
    if(!clean){ setStatus('Enter an ID'); return; }
    setStatus('Loaded ID: ' + clean);

    // push to history
    if(historyStack.length === 0 || historyStack[historyStack.length-1] !== clean){
      historyStack.push(clean);
    }

    // attempt to load with any extension
    loadWithExtensions(clean, function(foundUrl){
      if(foundUrl){ renderImage(foundUrl, clean); }
      else { placeholder(clean); }
    });
  }

  // Public functions for buttons
  window.start = function(){
    loadPerson(inputEl.value);
  };

  window.goBack = function(){
    if(historyStack.length > 1){
      historyStack.pop(); // current
      const prev = historyStack.pop(); // previous
      if(prev){ inputEl.value = prev; loadPerson(prev); }
    }
  };

  // support Enter key
  inputEl.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); window.start(); }
  });

  // Auto-load if URL has ?id=
  const params = new URLSearchParams(location.search);
  const idFromQuery = params.get('id');
  if(idFromQuery){
    inputEl.value = idFromQuery;
    loadPerson(idFromQuery);
  }

})();