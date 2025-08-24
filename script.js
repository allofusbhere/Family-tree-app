
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

  // History (unchanged)
  const historyStack = [];
  function pushHistory(id){ if(historyStack.length===0 || historyStack[historyStack.length-1]!==id) historyStack.push(id); }
  function popHistory(){ if(historyStack.length>1){ historyStack.pop(); return historyStack[historyStack.length-1]; } return historyStack[0]; }

  // Labels placeholder
  const labels = {"100000":"Fred (anchor)", "140000":"Aaron", "240000":"Damita"};

  // Spouse map (2-way)
  let spouseMap = {"140000":"240000","240000":"140000"};
  async function loadSpouseMap(){ try{ const r=await fetch('spouse_link.json',{cache:'no-store'}); if(r.ok) spouseMap=await r.json(); }catch(e){} }

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

  // === Swipe logic: simple, minimal, same pattern as earlier working builds ===
  let sx=0, sy=0, touching=false;
  const SWIPE_MIN = 40;
  stage.addEventListener('touchstart', (e)=>{ const t=e.touches[0]; sx=t.clientX; sy=t.clientY; touching=true; }, {passive:true});
  stage.addEventListener('touchend', (e)=>{
    if(!touching) return;
    touching=false;
    const t=e.changedTouches[0]; const dx=t.clientX - sx; const dy=t.clientY - sy;
    const ax=Math.abs(dx), ay=Math.abs(dy);
    if(ax>ay && ax>SWIPE_MIN){
      if(dx>0){ showSpouse(currentId()); } // right only
    } else if(ay>ax && ay>SWIPE_MIN){
      if(dy<0){ /* up reserved */ } else { /* down reserved */ }
    }
  }, {passive:true});
  // Mouse fallback (desktop testing only)
  stage.addEventListener('mousedown', (e)=>{ sx=e.clientX; sy=e.clientY; touching=true; });
  stage.addEventListener('mouseup', (e)=>{
    if(!touching) return; touching=false;
    const dx=e.clientX - sx, dy=e.clientY - sy;
    const ax=Math.abs(dx), ay=Math.abs(dy);
    if(ax>ay && ax>SWIPE_MIN){ if(dx>0){ showSpouse(currentId()); } }
  });

  // Tap spouse overlay to anchor spouse (THE ONLY BEHAVIORAL CHANGE WE'RE ADDING)
  spouseOverlay.addEventListener('click', ()=>{
    const spId = spouseImg.alt;
    if(spId) setAnchor(spId);
  });

  function currentId(){ const m=(window.location.hash||'').match(/id=([0-9.]+)/); return m?m[1]:'100000'; }

  async function init(){ await loadSpouseMap(); setAnchor(currentId()); }
  document.addEventListener('DOMContentLoaded', init);
})();
