// SwipeTree v5s2 (as index): robust swipes + spouse anchor, using your standard filenames
(function(){
  const IMAGES_BASE_URL = "https://allofusbhere.github.io/family-tree-images/"; // flat folder
  const overlay = document.getElementById('overlay');
  const grid = document.getElementById('overlayGrid');
  const title = document.getElementById('overlayTitle');
  const img = document.getElementById('anchorImg');
  const idLabel = document.getElementById('idLabel');
  const backBtn = document.getElementById('backBtn');
  const debugEl = document.getElementById('debug');

  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  let currentId = null;
  const historyStack = [];

  const idToSrc = (idLike)=> IMAGES_BASE_URL + String(idLike) + ".jpg";
  function showAnchor(id){
    if(!id) return;
    currentId = String(id);
    idLabel.textContent = "#" + currentId;
    img.src = idToSrc(currentId);
  }
  function pushHistory(id){
    if(id && (historyStack.length===0 || historyStack[historyStack.length-1]!==id)){ historyStack.push(id); }
  }
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

  // Gestures (touch + mouse)
  let startX=0, startY=0, startT=0;
  const THRESH = 28, MAX_TIME = 800;
  function start(pt){ startX=pt.clientX; startY=pt.clientY; startT=Date.now(); }
  function end(pt){
    const dx = pt.clientX - startX;
    const dy = pt.clientY - startY;
    const dt = Date.now() - startT;
    if(dt>MAX_TIME) return;
    if(Math.abs(dx)<THRESH && Math.abs(dy)<THRESH) return;
    if(Math.abs(dx)>Math.abs(dy)){ dx>0 ? onSwipeRight() : onSwipeLeft(); }
    else { dy<0 ? onSwipeUp() : onSwipeDown(); }
  }
  document.body.addEventListener('touchstart', e=> start(e.changedTouches[0]), {passive:true});
  document.body.addEventListener('touchmove', e=> e.preventDefault(), {passive:false});
  document.body.addEventListener('touchend', e=> end(e.changedTouches[0]), {passive:true});
  let mouseDown=false;
  document.body.addEventListener('mousedown', e=>{ mouseDown=true; start(e); });
  document.body.addEventListener('mouseup', e=>{ if(mouseDown){ mouseDown=false; end(e); } });

  // Spouse map
  let spouseMap = {};
  fetch('spouse_link.json', {cache:'no-store'}).then(r=>r.json()).then(data=>{
    data.forEach(p=>{
      spouseMap[String(p.a)] = String(p.b);
      spouseMap[String(p.b)] = String(p.a);
    });
  }).catch(()=>{});

  function tile(id){
    const d = document.createElement('div'); d.className='tile';
    const im = document.createElement('img'); im.alt=String(id); im.src=idToSrc(id);
    const cap = document.createElement('div'); cap.className='caption'; cap.textContent = "#" + id;
    d.appendChild(im); d.appendChild(cap);
    d.addEventListener('click',()=> go(id));
    return d;
  }

  function onSwipeRight(){
    const partner = spouseMap[currentId];
    const spouseCandidate = partner || (currentId + ".1");
    grid.innerHTML='';
    title.textContent = partner ? "Spouse" : "Spouse (fallback .1)";
    grid.appendChild(tile(spouseCandidate));
    overlay.classList.remove('hidden');
  }
  function onSwipeLeft(){
    grid.innerHTML=''; title.textContent='Siblings (placeholder)';
    const n = Number(currentId);
    const base = Math.floor(n/100000)*100000;
    [base+10000, base+20000, base+30000].forEach(id=> grid.appendChild(tile(id)));
    overlay.classList.remove('hidden');
  }
  function onSwipeUp(){ grid.innerHTML=''; title.textContent='Parents (reserved)'; overlay.classList.remove('hidden'); }
  function onSwipeDown(){ grid.innerHTML=''; title.textContent='Children (reserved)'; overlay.classList.remove('hidden'); }

  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) closeOverlay(); });

  function startApp(){
    const saved = new URLSearchParams(location.hash.replace('#','')).get('id');
    let startId = saved || (typeof window.prompt==="function" ? window.prompt("Enter starting ID", "100000") : "100000");
    if(!startId || !/^\d{5,8}$/.test(String(startId))) startId = "100000";
    showAnchor(startId);
  }
  window.addEventListener('load', startApp);
})();