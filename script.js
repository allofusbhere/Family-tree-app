// SwipeTree — ButtonsOff Build (v3)
// Locked to *only* the family-tree-images repo for image lookup.
// We still load *all images in that repo* — "two bases" means two mirror URLs for the *same repo*.
// 1) GitHub Pages URL
// 2) jsDelivr mirror
// Also supports file extensions: .jpg, .JPG, .jpeg, .png

(function(){
  const anchorImg = document.getElementById('anchorImg');
  const anchorLabel = document.getElementById('anchorLabel');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const grid = document.getElementById('grid');
  const backBtn = document.getElementById('backBtn');
  const closeOverlayBtn = document.getElementById('closeOverlay');
  const stage = document.getElementById('stage');

  // ---- Image lookup is restricted to the dedicated image repo ----
  const IMAGE_BASES = [
    'https://allofusbhere.github.io/family-tree-images/',
    'https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/'
  ];
  const IMAGE_EXTS = ['.jpg', '.JPG', '.jpeg', '.png'];
  const PLACEHOLDER = null; // optionally set to 'placeholder.jpg'

  const historyStack = [];
  let anchorId = getIdFromHash() || '100000';
  let touchStart = null;
  let longPressTimer = null;
  const LONG_PRESS_MS = 700;
  const SWIPE_THRESHOLD = 30; // px

  window.addEventListener('hashchange', () => {
    const id = getIdFromHash();
    if (id && id !== anchorId) {
      pushHistory(anchorId);
      setAnchor(id);
    }
  });
  backBtn.addEventListener('click', () => {
    if (!overlay.classList.contains('hidden')) { closeOverlay(); return; }
    const prev = historyStack.pop(); if (prev) setAnchor(prev);
  });
  closeOverlayBtn.addEventListener('click', closeOverlay);

  // Touch / swipe handling on stage (suppresses page scroll)
  stage.addEventListener('touchstart', onTouchStart, { passive:false });
  stage.addEventListener('touchmove', onTouchMove, { passive:false });
  stage.addEventListener('touchend', onTouchEnd, { passive:false });

  // Long press to edit label
  anchorImg.addEventListener('touchstart', (e) => startLongPress(e), { passive:false });
  anchorImg.addEventListener('touchend', cancelLongPress, { passive:false });
  anchorImg.addEventListener('mousedown', (e) => startLongPress(e));
  anchorImg.addEventListener('mouseup', cancelLongPress);

  setAnchor(anchorId);

  function getIdFromHash(){ const m = location.hash.match(/id=(\d{6})/); return m ? m[1] : null; }
  function setHash(id){ location.hash = '#id=' + id; }
  function pushHistory(id){ if (historyStack.at(-1) !== id) historyStack.push(id); }

  async function setAnchor(id){
    anchorId = normalizeId(id);
    setHash(anchorId);
    anchorImg.src = await bestImageURL(anchorId);
    anchorImg.alt = anchorId;
    setAnchorLabel(anchorId);
  }

  function normalizeId(id){ return String(id).split('.')[0].padStart(6,'0').slice(0,6); }
  function setAnchorLabel(id){
    const key = 'label:' + id;
    const stored = localStorage.getItem(key);
    anchorLabel.textContent = stored ? stored : id;
  }

  async function bestImageURL(idOrSpouse){
    // Try each base + extension; first successful wins
    for (const base of IMAGE_BASES){
      for (const ext of IMAGE_EXTS){
        const url = base.replace(/\/?$/,'/') + idOrSpouse + ext;
        if (await imageExists(url)) return url;
      }
    }
    if (PLACEHOLDER) return PLACEHOLDER;
    // default to first candidate (may 404 visually)
    return (IMAGE_BASES[0].replace(/\/?$/,'/') + idOrSpouse + IMAGE_EXTS[0]);
  }

  function imageExists(url){
    return new Promise(resolve => {
      const img = new Image();
      let done=false;
      img.onload = ()=>{ if(!done){ done=true; resolve(true);} };
      img.onerror = ()=>{ if(!done){ done=true; resolve(false);} };
      img.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
      setTimeout(()=>{ if(!done){ done=true; resolve(false); } }, 2500);
    });
  }

  // Relationship math
  function lastNonZeroIndex(id){
    const digits = [...id].map(d=>+d);
    for (let i=digits.length-1;i>=0;i--) if (digits[i]!==0) return i;
    return -1;
  }
  function setDigit(id, idx, val){
    const digits = [...id].map(d=>+d);
    digits[idx]=val; for (let j=idx+1;j<6;j++) digits[j]=0;
    return digits.join('');
  }
  function getChildren(id){
    id = normalizeId(id);
    const i = lastNonZeroIndex(id);
    if (i>=5) return [];
    const next=i+1, out=[];
    for (let d=1; d<=9; d++) out.push(setDigit(id, next, d));
    return out;
  }
  function getSiblings(id){
    id = normalizeId(id);
    const i = lastNonZeroIndex(id);
    if (i<0) return [];
    const curr = +id[i], out=[];
    for (let d=1; d<=9; d++){ if (d!==curr) out.push(setDigit(id, i, d)); }
    return out;
  }
  function getParent(id){
    id = normalizeId(id);
    const i = lastNonZeroIndex(id);
    if (i<=0) return null;
    return setDigit(id, i, 0);
  }

  // Swipe
  function onTouchStart(e){ if (e.touches && e.touches.length>1) return; const t=e.touches?e.touches[0]:e; touchStart={x:t.clientX,y:t.clientY,time:Date.now()}; if (e.cancelable) e.preventDefault(); }
  function onTouchMove(e){ if (e.cancelable) e.preventDefault(); }
  async function onTouchEnd(e){
    if (!touchStart) return;
    const t=(e.changedTouches&&e.changedTouches[0])?e.changedTouches[0]:e;
    const dx=t.clientX-touchStart.x, dy=t.clientY-touchStart.y;
    const adx=Math.abs(dx), ady=Math.abs(dy);
    touchStart=null;
    if (adx<SWIPE_THRESHOLD && ady<SWIPE_THRESHOLD) return; // tap

    if (adx>ady){
      if (dx>0){ await showSpouse(); } // → spouse
      else { await showGrid('Siblings', getSiblings(anchorId)); } // ← siblings
    } else {
      if (dy<0){
        const p=getParent(anchorId); const ids=[]; if (p) ids.push(p);
        await showGrid('Parents', ids, { tryPairSpouse:true });
      } else {
        await showGrid('Children', getChildren(anchorId));
      }
    }
  }

  async function showSpouse(){
    const spouseId = anchorId + '.1';
    const url = await bestImageURL(spouseId);
    const ok = await imageExists(url);
    const ids = ok ? [spouseId] : [];
    await showGrid('Spouse', ids, { allowSpouseId:true });
  }

  async function showGrid(title, ids, options){
    options = options || {};
    overlayTitle.textContent = title;
    grid.innerHTML = '';
    overlay.classList.remove('hidden');

    for (const id of ids){
      const url = await bestImageURL(id);
      if (!(await imageExists(url))) continue;

      const card = document.createElement('div');
      card.className = 'card';
      const img = document.createElement('img');
      img.src = url; img.alt = id;
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = labelForId(id);
      card.appendChild(img); card.appendChild(name);
      card.addEventListener('click', () => {
        closeOverlay();
        const numeric = id.split('.')[0];
        if (numeric !== anchorId){
          pushHistory(anchorId);
          setAnchor(numeric);
        }
      });
      grid.appendChild(card);
    }

    if (options.tryPairSpouse && ids.length===1){
      const p = ids[0];
      if (/^\d{6}$/.test(p)){
        const spouseImgId = p + '.1';
        const url = await bestImageURL(spouseImgId);
        if (await imageExists(url)){
          const card = document.createElement('div');
          card.className='card';
          const img=document.createElement('img'); img.src=url; img.alt=spouseImgId;
          const name=document.createElement('div'); name.className='name'; name.textContent=labelForId(spouseImgId);
          card.appendChild(img); card.appendChild(name);
          card.addEventListener('click', ()=>{ closeOverlay(); pushHistory(anchorId); setAnchor(p); });
          grid.appendChild(card);
        }
      }
    }

    if (grid.children.length===0){ closeOverlay(); }
  }

  function closeOverlay(){ overlay.classList.add('hidden'); }
  function labelForId(id){ const key='label:' + id.split('.')[0]; return localStorage.getItem(key) || id; }

  function startLongPress(e){
    cancelLongPress();
    longPressTimer = setTimeout(()=>{
      e.preventDefault?.();
      const current = labelForId(anchorId);
      const next = prompt('Edit label for ' + anchorId, current);
      if (next!=null){ localStorage.setItem('label:' + anchorId, next.trim()); setAnchorLabel(anchorId); }
    }, LONG_PRESS_MS);
  }
  function cancelLongPress(){ if (longPressTimer){ clearTimeout(longPressTimer); longPressTimer=null; } }

})();