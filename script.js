// script.js — helpers only (no swipe listeners). Keeps anchors and hash in sync.
(function(){
  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const startForm = document.getElementById('startForm');
  const startIdInput = document.getElementById('startId');
  const anchorEl = document.getElementById('anchor');
  const overlay = document.getElementById('overlay');
  function imgUrlForId(id){ return IMAGE_BASE + String(id) + '.jpg'; }
  function getIdFromHash(){ const m = location.hash.match(/id=([0-9.]+)/); return m ? m[1] : null; }
  function setIdInHash(id){ const newHash = `#id=${id}`; if (location.hash !== newHash){ history.pushState({id}, '', newHash); } }
  async function loadAnchor(id){ anchorEl.src = imgUrlForId(id); anchorEl.setAttribute('data-id', String(id)); setIdInHash(String(id)); overlay.classList.add('hidden'); }
  startForm.addEventListener('submit', (e)=>{ e.preventDefault(); const v=(startIdInput.value||'').trim(); if(!v) return; loadAnchor(v); });
  window.addEventListener('popstate', ()=>{ const id=getIdFromHash(); if(id) loadAnchor(id); });
  loadAnchor(getIdFromHash() || '100000');
})();