
(function () {
  const BASE = window.IMAGE_BASE || "https://allofusbhere.github.io/family-tree-images/";
  const q = (s)=>document.querySelector(s);
  const anchorImg = q('#anchorImg');
  const anchorLabel = q('#anchorLabel');
  const spouseOverlay = q('#spouseOverlay');
  const spouseImg = q('#spouseImg');
  const spouseLabel = q('#spouseLabel');
  const backBtn = q('#backBtn');
  const stage = q('#stage');

  // History
  const historyStack = [];
  function pushHistory(id){ if(historyStack.at(-1)!==id) historyStack.push(id); }
  function popHistory(){ if(historyStack.length>1){ historyStack.pop(); return historyStack.at(-1);} return historyStack[0]; }

  // Labels sample (replace with Netlify later)
  const labels = {
    "100000": "Fred (anchor)",
    "140000": "Aaron",
    "240000": "Damita"
  };

  // Spouse map
  let spouseMap = { "140000":"240000", "240000":"140000" };
  async function loadSpouseMap() {
    try{
      const res = await fetch('spouse_link.json', {cache:'no-store'});
      if(res.ok){ spouseMap = await res.json(); }
    }catch(e){ console.warn('[v5f] spouse_link.json not found, using inline defaults.'); }
  }

  function imgUrlFor(id){ return BASE + String(id) + '.jpg'; }

  function setAnchor(id){
    window.location.hash = 'id=' + id;
    pushHistory(id);
    anchorImg.src = imgUrlFor(id);
    anchorImg.alt = id;
    anchorLabel.textContent = labels[id] || id;
    hideSpouse();
  }

  function showSpouse(forId){
    const sp = spouseMap[forId];
    if(!sp){ hideSpouse(); return; }
    spouseImg.src = imgUrlFor(sp);
    spouseImg.alt = sp;
    spouseLabel.textContent = labels[sp] || sp;
    spouseOverlay.classList.remove('hidden');
  }
  function hideSpouse(){ spouseOverlay.classList.add('hidden'); }

  // --- Unified gesture system (pointer + touch fallback) ---
  let startX=0, startY=0, tracking=false;

  function begin(x,y,ev){
    tracking = true; startX = x; startY = y;
    // Stop the page from scrolling/zooming during gestures
    if(ev && ev.cancelable) ev.preventDefault();
  }
  function end(x,y,ev){
    if(!tracking) return;
    tracking=false;
    const dx = x - startX, dy = y - startY;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    const SWIPE_MIN = 40;
    if(ev && ev.cancelable) ev.preventDefault();

    if(absX > absY && absX > SWIPE_MIN){
      if(dx > 0){  // right
        showSpouse(currentId());
      } else {
        // left = siblings (reserved)
      }
    } else if(absY > absX && absY > SWIPE_MIN){
      if(dy < 0){
        // up = parents (reserved)
      } else {
        // down = children (reserved)
      }
    }
  }

  // Pointer events (iPad Safari 16+ supports these)
  if(window.PointerEvent){
    stage.addEventListener('pointerdown', (e)=>begin(e.clientX, e.clientY, e), {passive:false});
    stage.addEventListener('pointerup',   (e)=>end(e.clientX, e.clientY, e),   {passive:false});
  } else {
    // Touch fallback
    stage.addEventListener('touchstart', (e)=>{
      const t = e.touches[0]; begin(t.clientX, t.clientY, e);
    }, {passive:false});
    stage.addEventListener('touchend', (e)=>{
      const t = e.changedTouches[0]; end(t.clientX, t.clientY, e);
    }, {passive:false});
    // Mouse fallback
    stage.addEventListener('mousedown', (e)=>begin(e.clientX, e.clientY, e), {passive:false});
    stage.addEventListener('mouseup',   (e)=>end(e.clientX, e.clientY, e),   {passive:false});
  }

  // Tap spouse overlay to anchor spouse
  spouseOverlay?.addEventListener('click', function(){
    const spId = spouseImg?.alt; if(spId) setAnchor(spId);
  }, {passive:false});

  backBtn?.addEventListener('click', ()=> setAnchor(popHistory()));

  function currentId(){
    const m = (window.location.hash||'').match(/id=([0-9.]+)/);
    return m ? m[1] : '100000';
  }

  async function init(){
    await loadSpouseMap();
    setAnchor(currentId());
  }

  document.addEventListener('DOMContentLoaded', init);
})();
