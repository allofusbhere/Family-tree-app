// SwipeTree restore (v5s): rebuild swipes + spouse anchoring from mapping
(function(){
  const IMAGES_BASE_URL = "https://allofusbhere.github.io/family-tree-images/"; // flat folder
  const overlay = document.getElementById('overlay');
  const grid = document.getElementById('overlayGrid');
  const title = document.getElementById('overlayTitle');
  const img = document.getElementById('anchorImg');
  const idLabel = document.getElementById('idLabel');
  const backBtn = document.getElementById('backBtn');
  const debugEl = document.getElementById('debug');

  let currentId = null;
  const historyStack = [];

  // === Utilities ===
  const idToSrc = (idLike) => IMAGES_BASE_URL + String(idLike) + ".jpg";
  function showAnchor(id){
    if(!id) return;
    currentId = String(id);
    idLabel.textContent = "#" + currentId;
    img.src = idToSrc(currentId);
  }
  function pushHistory(id){ if(historyStack.length===0 || historyStack[historyStack.length-1]!==id){ historyStack.push(id);} }
  function go(id){
    pushHistory(currentId);
    closeOverlay();
    showAnchor(id);
  }
  function closeOverlay(){ overlay.classList.add('hidden'); grid.innerHTML=''; title.textContent=''; }

  backBtn.addEventListener('click', ()=>{
    if(!overlay.classList.contains('hidden')){ closeOverlay(); return; }
    const prev = historyStack.pop();
    if(prev){ showAnchor(prev); }
  });

  // === Gesture detection ===
  let startX=0, startY=0, startT=0;
  const THRESH = 35, MAX_TIME = 600;
  function onTouchStart(e){
    const t = e.changedTouches[0]; startX=t.clientX; startY=t.clientY; startT=Date.now();
  }
  function onTouchEnd(e){
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const dt = Date.now()-startT;
    if(dt>MAX_TIME) return;
    if(Math.abs(dx)<THRESH && Math.abs(dy)<THRESH) return;

    if(Math.abs(dx)>Math.abs(dy)){
      if(dx>0){ onSwipeRight(); } else { onSwipeLeft(); }
    }else{
      if(dy<0){ onSwipeUp(); } else { onSwipeDown(); }
    }
  }
  document.body.addEventListener('touchstart', onTouchStart, {passive:true});
  document.body.addEventListener('touchend', onTouchEnd, {passive:true});

  // === Data: spouse links ===
  let spouseMap = {};
  fetch('spouse_link.json').then(r=>r.json()).then(data=>{
    data.forEach(p=>{
      spouseMap[String(p.a)] = String(p.b);
      spouseMap[String(p.b)] = String(p.a);
    });
  }).catch(()=>{
    // silent; we can still fall back to .1 scheme
  });

  // === Swipe handlers ===
  function tile(id){ 
    const d = document.createElement('div'); d.className='tile';
    const im = document.createElement('img'); im.alt=String(id); im.src=idToSrc(id);
    const cap = document.createElement('div'); cap.className='caption'; cap.textContent = "#" + id;
    d.appendChild(im); d.appendChild(cap);
    d.addEventListener('click',()=> go(id));
    return d;
  }

  function onSwipeRight(){
    // SPOUSE
    const partner = spouseMap[currentId];
    const spouseCandidate = partner || (currentId + ".1"); // fallback image
    grid.innerHTML='';
    title.textContent = partner ? "Spouse" : "Spouse (fallback .1)";
    grid.appendChild(tile(spouseCandidate));
    overlay.classList.remove('hidden');
  }
  function onSwipeLeft(){
    // SIBLINGS (placeholder listing based on first digit families)
    grid.innerHTML='';
    title.textContent='Siblings (preview)';
    // Minimal, non-intrusive preview: show three typical siblings for classic 140000 pattern
    const n = Number(currentId);
    const base = Math.floor(n/100000)*100000;
    [base+10000, base+20000, base+30000].forEach(id=> grid.appendChild(tile(id)));
    overlay.classList.remove('hidden');
  }
  function onSwipeUp(){
    title.textContent='Parents (reserved for next build)';
    grid.innerHTML='';
    overlay.classList.remove('hidden');
  }
  function onSwipeDown(){
    title.textContent='Children (reserved for next build)';
    grid.innerHTML='';
    overlay.classList.remove('hidden');
  }

  // Close overlay by tapping empty space
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) closeOverlay(); });

  // === Init ===
  function start(){
    const saved = new URLSearchParams(location.hash.replace('#','')).get('id');
    let startId = saved || (typeof window.prompt==="function" ? window.prompt("Enter starting ID", "100000") : "100000");
    if(!startId || !/^\d{5,8}$/.test(String(startId))) startId = "100000";
    showAnchor(startId);
  }
  window.addEventListener('load', start);
})();