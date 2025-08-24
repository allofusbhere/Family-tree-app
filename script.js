
(function () {
  const BASE = window.IMAGE_BASE || "https://allofusbhere.github.io/family-tree-images/";
  const q = (s)=>document.querySelector(s);
  const anchorImg = q('#anchorImg');
  const anchorLabel = q('#anchorLabel');
  const spouseOverlay = q('#spouseOverlay');
  const spouseImg = q('#spouseImg');
  const spouseLabel = q('#spouseLabel');
  const backBtn = q('#backBtn');

  // History
  const historyStack = [];
  function pushHistory(id){ if(historyStack.length===0 || historyStack[historyStack.length-1]!==id) historyStack.push(id); }
  function popHistory(){ if(historyStack.length>1){ historyStack.pop(); return historyStack[historyStack.length-1]; } return historyStack[0]; }

  // Simple labels cache (optional; can be replaced by Netlify function)
  const labels = {
    "100000": "Fred (anchor)",
    "140000": "Aaron",
    "240000": "Damita"
  };

  // Spouse map (both directions). In repo, place spouse_link.json at root to override.
  let spouseMap = { "140000":"240000", "240000":"140000" };

  async function loadSpouseMap() {
    try{
      const res = await fetch('spouse_link.json', {cache:'no-store'});
      if(res.ok){
        const json = await res.json();
        spouseMap = json;
      }
    }catch(e){
      console.warn('[v5e] spouse_link.json not found, using inline defaults.');
    }
  }

  function imgUrlFor(id){
    // Person photos are id.jpg; spouse-face variants (like .1) are separate files but not anchor ids.
    return BASE + String(id) + '.jpg';
  }

  function setAnchor(id){
    window.location.hash = 'id=' + id;
    pushHistory(id);
    anchorImg.src = imgUrlFor(id);
    anchorImg.alt = id;
    anchorLabel.textContent = labels[id] || id;
    // Hide overlays when anchoring
    hideSpouse();
  }

  function showSpouse(forId){
    const sp = spouseMap[forId];
    if(!sp){ hideSpouse(); return; }
    spouseImg.src = imgUrlFor(sp); // display spouse's own image so user can confirm visually
    spouseImg.alt = sp;
    spouseLabel.textContent = labels[sp] || sp;
    spouseOverlay.classList.remove('hidden');
  }
  function hideSpouse(){ spouseOverlay.classList.add('hidden'); }

  // --- Gestures ---
  let touchStartX=0, touchStartY=0, touching=false;
  const SWIPE_MIN = 40;

  function onTouchStart(ev){
    const t = ev.touches ? ev.touches[0] : ev;
    touchStartX = t.clientX; touchStartY = t.clientY; touching=true;
  }
  function onTouchEnd(ev){
    if(!touching) return;
    const t = ev.changedTouches ? ev.changedTouches[0] : ev;
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    touching=false;
    const absX = Math.abs(dx), absY=Math.abs(dy);

    if(absX > absY && absX > SWIPE_MIN){
      if(dx > 0){
        // Right = show spouse
        const id = currentId();
        showSpouse(id);
      } else {
        // Left = siblings (not changed in this package)
      }
    } else if(absY > absX && absY > SWIPE_MIN){
      if(dy < 0){
        // Up = parents (not changed)
      } else {
        // Down = children (not changed)
      }
    }
  }

  // Tap inside spouse overlay -> ANCHOR THE SPOUSE (the fix)
  spouseOverlay?.addEventListener('click', function(e){
    // If user clicks anywhere on the spouse card, anchor to spouse ID
    const spId = spouseImg?.alt;
    if(spId){ setAnchor(spId); }
  });

  // Back
  backBtn?.addEventListener('click', ()=>{
    const prev = popHistory();
    setAnchor(prev);
  });

  function currentId(){
    const h = window.location.hash || '';
    const m = h.match(/id=([0-9.]+)/);
    return m ? m[1] : '100000';
  }

  async function init(){
    await loadSpouseMap();
    const startId = currentId();
    pushHistory(startId);
    setAnchor(startId);
    // Bind gestures
    const stage = q('#stage');
    ['touchstart','mousedown'].forEach(ev=>stage.addEventListener(ev,onTouchStart, {passive:true}));
    ['touchend','mouseup'].forEach(ev=>stage.addEventListener(ev,onTouchEnd, {passive:true}));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
