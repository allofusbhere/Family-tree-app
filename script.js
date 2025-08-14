// SwipeTree — 2025-08-14-mb-03
(function(){
  'use strict';

  const BUILD_TAG = '2025-08-14-mb-03-' + new Date().toISOString().replace(/[-:TZ]/g,'').slice(0,14);
  const STATUS = document.getElementById('status');
  document.getElementById('buildTag').textContent = `build ${BUILD_TAG}`;

  const anchorImg = document.getElementById('anchorImg');
  const stage = document.getElementById('stage');
  const startBtn = document.getElementById('startBtn');
  const backBtn  = document.getElementById('backBtn');
  const labelName = document.getElementById('labelName');
  const labelDob  = document.getElementById('labelDob');

  let currentId = null;
  const historyStack = [];

  // Images from GitHub Pages:
  const IMAGE_BASE = `https://allofusbhere.github.io/family-tree-images/`;

  function checkImageExists(id) {
    const exts = ['.jpg','.JPG','.jpeg','.JPEG','.png','.PNG','.webp','.WEBP'];
    return new Promise((resolve) => {
      let i = 0;
      const next = () => {
        if (i >= exts.length) return resolve(null);
        const ext = exts[i++];
        const img = new Image();
        img.onload = () => resolve({ id, url: `${IMAGE_BASE}${id}${ext}?b=${BUILD_TAG}` });
        img.onerror = next;
        img.src = `${IMAGE_BASE}${id}${ext}?b=${BUILD_TAG}`;
      };
      next();
    });
  }

  async function setAnchor(id, pushHistory=true){
    if(!id) return;
    STATUS.textContent = `Loading ${id}…`;
    const found = await checkImageExists(id);
    if(!found){
      STATUS.textContent = `Image not found for ${id}`;
      anchorImg.removeAttribute('src');
      return;
    }
    if(pushHistory && currentId) historyStack.push(currentId);
    currentId = id;
    anchorImg.src = found.url;
    anchorImg.alt = `Person ${id}`;
    STATUS.textContent = `Showing ${id}`;
    applyLabel(id);
  }

  function applyLabel(id){
    const meta = getPersonMeta(id);
    labelName.textContent = meta?.name || '';
    labelDob.textContent  = meta?.dob ? `DOB: ${meta.dob}` : '';
  }

  function getPersonMeta(id){
    try{
      const raw = localStorage.getItem(`label:${id}`);
      return raw ? JSON.parse(raw) : null;
    }catch{ return null; }
  }
  function setPersonMeta(id, meta){
    localStorage.setItem(`label:${id}`, JSON.stringify(meta||{}));
    applyLabel(id);
  }

  async function toggleSpouse(){
    if(!currentId) return;
    const spouseId = currentId.includes('.1') ? currentId.replace('.1','') : `${currentId}.1`;
    const exists = await checkImageExists(spouseId);
    if(!exists){
      STATUS.textContent = `No spouse image for ${currentId}`;
      return;
    }
    await setAnchor(spouseId, true);
  }

  backBtn.addEventListener('click', ()=>{
    const prev = historyStack.pop();
    if(prev) setAnchor(prev, false);
  });

  startBtn.addEventListener('click', async ()=>{
    const v = prompt('Enter starting ID (e.g., 140000):', currentId||'');
    if(v && v.trim()) await setAnchor(v.trim(), true);
  });

  // Double-tap / double-click
  let lastTap = 0;
  const TAP_MS = 300;
  function maybeDoubleTap(e){
    const now = Date.now();
    if(now - lastTap <= TAP_MS){
      e.preventDefault();
      handleEdit();
    }
    lastTap = now;
  }
  function handleEdit(){
    if(!currentId) return;
    const existing = getPersonMeta(currentId) || { name:'', dob:'' };
    const name = prompt(`Edit name for ${currentId}:`, existing.name||'');
    if(name===null) return;
    const dob  = prompt(`Edit DOB for ${currentId} (optional):`, existing.dob||'');
    if(dob===null) return;
    setPersonMeta(currentId, { name: name.trim(), dob: dob.trim() });
    STATUS.textContent = `Saved label for ${currentId}`;
  }

  // Touch swipe (right = spouse)
  let sx=0, sy=0;
  const SW = 50;
  function onTS(e){
    const t = e.changedTouches[0];
    sx=t.clientX; sy=t.clientY;
    maybeDoubleTap(e);
  }
  async function onTE(e){
    const t = e.changedTouches[0];
    const dx=t.clientX-sx, dy=t.clientY-sy;
    if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>SW){
      if(dx>0) await toggleSpouse();
      else STATUS.textContent='Left swipe reserved.';
    }
  }

  stage.addEventListener('touchstart', onTS, {passive:true});
  stage.addEventListener('touchend', onTE, {passive:true});
  anchorImg.addEventListener('touchstart', onTS, {passive:true});
  anchorImg.addEventListener('touchend', onTE, {passive:true});
  stage.addEventListener('dblclick', (e)=>{e.preventDefault(); handleEdit();});
  anchorImg.addEventListener('dragstart', e=>e.preventDefault());

  window.addEventListener('load', async ()=>{
    const first = prompt('Enter starting ID (e.g., 140000):','');
    if(first && first.trim()) await setAnchor(first.trim(), true);
    else STATUS.textContent = 'Tap Start to enter an ID.';
  });
})();