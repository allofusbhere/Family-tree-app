
/* SwipeTree — minimal build focusing on:
   - Start button to change anchor
   - Swipe right toggles spouse (.1) and back
   - Long-press to edit caption (double-tap disabled)
   - First name under each image (localStorage)
   - Anchor highlight persists
   - Cache-busted image attempts with case-insensitive extensions
*/

(function(){
  'use strict';

  const BUILD_TAG = (()=>{
    const d = new Date();
    const pad = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  })();

  // ====== CONFIG ======
  // Update this to where your image files live. Examples:
  //   '/family-tree-images/'  or  'https://allofusbhere.github.io/family-tree-images/'
  const IMAGE_BASE = (window.SWIPE_TREE_IMAGE_BASE || '/family-tree-images/');
  const TRY_EXTS = ['.jpg','.JPG','.jpeg','.JPEG','.png','.PNG'];
  const PLACEHOLDER_DATAURL =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1066">
      <rect width="100%" height="100%" fill="#22252b"/>
      <text x="50%" y="50%" fill="#889" font-family="Arial, sans-serif" font-size="42" text-anchor="middle">Image not found</text>
    </svg>`);

  // ====== State ======
  let anchorId = null;           // e.g., "140000" or "140000.1"
  const historyStack = [];       // keeps previous anchors
  const imgEl = document.getElementById('anchorImg');
  const captionEl = document.getElementById('anchorCaption');
  const hintEl = document.getElementById('hint');
  const backBtn = document.getElementById('backBtn');
  const startBtn = document.getElementById('startBtn');
  const card = document.getElementById('anchorCard');
  const modal = document.getElementById('modal');
  const nameInput = document.getElementById('nameInput');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  // ====== Utilities ======
  function buildUrl(id, ext){
    return `${IMAGE_BASE}${id}${ext}?v=${BUILD_TAG}`;
  }
  function setCaptionFromStorage(id){
    const name = localStorage.getItem(`name:${id}`);
    captionEl.textContent = name?.trim() ? name.trim() : 'Anchor person';
  }

  async function resolveImageSrc(id){
    for (const ext of TRY_EXTS){
      const url = buildUrl(id, ext);
      const ok = await testImage(url);
      if (ok) return url;
    }
    return PLACEHOLDER_DATAURL;
  }
  function testImage(url){
    return new Promise((resolve)=>{
      const im = new Image();
      im.onload = ()=> resolve(true);
      im.onerror = ()=> resolve(false);
      im.src = url;
    });
  }

  async function setAnchor(newId, pushHistory=true){
    if (!newId) return;
    if (anchorId && pushHistory) historyStack.push(anchorId);
    backBtn.disabled = historyStack.length === 0;

    anchorId = String(newId);
    imgEl.src = PLACEHOLDER_DATAURL;
    setCaptionFromStorage(anchorId);
    // Keep highlight always
    card.classList.add('active');

    const src = await resolveImageSrc(anchorId);
    imgEl.src = src;
  }

  // ====== Start / Back ======
  startBtn.addEventListener('click', () => {
    const val = prompt('Enter starting ID (e.g., 140000):', anchorId || '');
    if (!val) return;
    // Trim and basic sanity
    const id = val.trim();
    setAnchor(id, /*pushHistory*/ !!anchorId);
  });

  backBtn.addEventListener('click', () => {
    const prev = historyStack.pop();
    if (prev){
      setAnchor(prev, /*pushHistory*/ false);
    }
    backBtn.disabled = historyStack.length === 0;
  });

  // ====== Long-press Edit ======
  let pressTimer = null;
  let touchMoved = false;
  const LONG_PRESS_MS = 450;

  function openModal(){
    nameInput.value = (localStorage.getItem(`name:${anchorId}`) || '').trim();
    modal.classList.remove('hidden');
    nameInput.focus();
  }
  function closeModal(){
    modal.classList.add('hidden');
  }
  function saveName(){
    const val = nameInput.value.trim();
    if (val) localStorage.setItem(`name:${anchorId}`, val);
    else localStorage.removeItem(`name:${anchorId}`);
    setCaptionFromStorage(anchorId);
    closeModal();
  }

  function startPressTimer(){
    clearTimeout(pressTimer);
    pressTimer = setTimeout(()=>{
      // Only long-press opens modal; no double-tap handler at all
      openModal();
    }, LONG_PRESS_MS);
  }
  function clearPressTimer(){ clearTimeout(pressTimer); pressTimer = null; }

  // Mouse (desktop) support
  card.addEventListener('mousedown', (e)=>{ startPressTimer(); });
  card.addEventListener('mouseup', (e)=>{ clearPressTimer(); });
  card.addEventListener('mouseleave', (e)=>{ clearPressTimer(); });

  // Touch (iPad) support
  card.addEventListener('touchstart', (e)=>{
    touchMoved = false;
    startPressTimer();
  }, {passive:true});
  card.addEventListener('touchmove', (e)=>{
    touchMoved = true; // cancels long-press if you begin swiping
  }, {passive:true});
  card.addEventListener('touchend', (e)=>{
    if (pressTimer && !touchMoved) {
      // a tap, do nothing (no double-tap feature)
    }
    clearPressTimer();
  }, {passive:true});

  saveBtn.addEventListener('click', saveName);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{
    if (e.target === modal) closeModal();
  });

  // ====== Swipe Detection (right = spouse toggle) ======
  let sx=0, sy=0, dx=0, dy=0, tracking=false;
  const SWIPE_THRESH = 40; // px

  function onStart(x,y){ tracking=true; sx=x; sy=y; dx=0; dy=0; }
  function onMove(x,y){ if(!tracking) return; dx=x-sx; dy=y-sy; }
  function onEnd(){
    if(!tracking) return;
    tracking=false;
    // horizontal dominant swipe
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESH){
      if (dx > 0){
        // right swipe -> toggle spouse
        toggleSpouse();
      } else {
        // left swipe -> return from spouse if currently on spouse
        if (isSpouse(anchorId) && historyStack.length){
          setAnchor(historyStack.pop(), /*pushHistory*/ false);
          backBtn.disabled = historyStack.length === 0;
        }
      }
    }
  }

  // Touch
  card.addEventListener('touchstart', (e)=>{
    const t = e.changedTouches[0];
    onStart(t.clientX, t.clientY);
  }, {passive:true});
  card.addEventListener('touchmove', (e)=>{
    const t = e.changedTouches[0];
    onMove(t.clientX, t.clientY);
  }, {passive:true});
  card.addEventListener('touchend', (e)=> onEnd(), {passive:true});

  // Mouse (for desktop testing)
  card.addEventListener('pointerdown', (e)=> onStart(e.clientX, e.clientY));
  window.addEventListener('pointermove', (e)=> onMove(e.clientX, e.clientY));
  window.addEventListener('pointerup', onEnd);

  function isSpouse(id){
    return String(id).includes('.1');
  }
  async function toggleSpouse(){
    if (!anchorId) return;
    if (isSpouse(anchorId)){
      // if already spouse, go back to previous
      if (historyStack.length){
        setAnchor(historyStack.pop(), /*pushHistory*/ false);
        backBtn.disabled = historyStack.length === 0;
      }
      return;
    }
    // else try to show spouse file "<id>.1"
    const spouseId = `${anchorId}.1`;
    // Probe existence
    const ok = await testAnySource(spouseId);
    if (ok){
      setAnchor(spouseId, /*pushHistory*/ true);
    } else {
      // no-op if spouse not found
      hintEl.textContent = 'No spouse image found';
      setTimeout(()=>{ hintEl.textContent = 'Long-press to edit'; }, 1400);
    }
  }
  async function testAnySource(id){
    for (const ext of TRY_EXTS){
      const url = buildUrl(id, ext);
      if (await testImage(url)) return true;
    }
    return false;
  }

  // ====== Boot ======
  // If there's a previous session, resume it; otherwise ask.
  const last = sessionStorage.getItem('lastAnchorId');
  window.addEventListener('beforeunload', ()=>{
    if (anchorId) sessionStorage.setItem('lastAnchorId', anchorId);
  });

  // Start: use prompt to set ID if none
  (async function boot(){
    if (last){
      await setAnchor(last, false);
    } else {
      const val = prompt('Enter starting ID (e.g., 140000):', '140000');
      await setAnchor(val || '140000', false);
    }
  })();

})();