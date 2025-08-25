// SwipeTree v5s3 (as index): correct swipe math for branch level (xxxxx0,000 pattern)
(function(){
  const IMAGES_BASE_URL = "https://allofusbhere.github.io/family-tree-images/"; // flat folder
  const overlay = document.getElementById('overlay');
  const grid = document.getElementById('overlayGrid');
  const title = document.getElementById('overlayTitle');
  const img = document.getElementById('anchorImg');
  const idLabel = document.getElementById('idLabel');
  const backBtn = document.getElementById('backBtn');

  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  let currentId = null;
  const historyStack = [];

  // --- helpers ---
  const idToSrc = (idLike)=> IMAGES_BASE_URL + String(idLike) + ".jpg";
  const stripSpouse = (id)=> String(id).split('.')[0];
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

  // --- gestures ---
  let sx=0, sy=0, st=0;
  const THRESH = 28, MAX_TIME = 900;
  function start(pt){ sx=pt.clientX; sy=pt.clientY; st=Date.now(); }
  function end(pt){
    const dx = pt.clientX - sx, dy = pt.clientY - sy, dt = Date.now() - st;
    if(dt>MAX_TIME) return;
    if(Math.abs(dx)<THRESH && Math.abs(dy)<THRESH) return;
    if(Math.abs(dx)>Math.abs(dy)){ dx>0 ? onRight() : onLeft(); } else { dy<0 ? onUp() : onDown(); }
  }
  document.body.addEventListener('touchstart', e=> start(e.changedTouches[0]), {passive:true});
  document.body.addEventListener('touchmove', e=> e.preventDefault(), {passive:false});
  document.body.addEventListener('touchend', e=> end(e.changedTouches[0]), {passive:true});
  let md=false; document.body.addEventListener('mousedown', e=>{ md=true; start(e); });
  document.body.addEventListener('mouseup', e=>{ if(md){ md=false; end(e); } });

  // --- spouse map ---
  let spouseMap = {};
  fetch('spouse_link.json', {cache:'no-store'}).then(r=>r.json()).then(data=>{
    data.forEach(p=>{
      spouseMap[String(p.a)] = String(p.b);
      spouseMap[String(p.b)] = String(p.a);
    });
  }).catch(()=>{});

  // --- ID math for branch level ---
  function siblingsOf(idStr){
    const root = stripSpouse(idStr);
    if(!/^\d{6,7}$/.test(root)) return [];
    const n = Number(root);
    const hundredK = Math.floor(n/100000);               // e.g., 1 for 140000
    const selfTenK = Math.floor((n%100000)/10000);       // e.g., 4 for 140000
    const thousandsAndLow = n % 10000;                   // should be 0 at this level
    // Only treat as branch-level if thousands and below are zeros
    if(thousandsAndLow !== 0) return []; // we only implement precise branch case now
    const base = hundredK * 100000;
    const out = [];
    for(let k=1;k<=9;k++){
      const candidate = base + k*10000;
      if(k !== selfTenK) out.push(candidate);
    }
    return out;
  }

  function childrenOf(idStr){
    const root = stripSpouse(idStr);
    if(!/^\d{6,7}$/.test(root)) return [];
    const n = Number(root);
    // children at this level are +1000..+9000
    if(n % 10000 !== 0) return []; // only for branch anchors like 140000
    const base = n;
    const out = [];
    for(let k=1;k<=9;k++){ out.push(base + k*1000); }
    return out;
  }

  function parentOf(idStr){
    const root = stripSpouse(idStr);
    if(!/^\d{6,7}$/.test(root)) return null;
    const n = Number(root);
    // if it's the main branch base (e.g., 100000), no parent
    if(n % 100000 === 0) return null;
    // For 140000 -> 100000 (zero the ten-thousands digit)
    if(n % 10000 === 0){
      const hundredK = Math.floor(n/100000);
      return hundredK * 100000;
    }
    // For 141000 -> 140000 (zero the thousands digit)
    if(n % 1000 === 0){
      return Math.floor(n/10000)*10000;
    }
    return null; // deeper levels not implemented in this slice
  }

  function tile(id){
    const d = document.createElement('div'); d.className='tile';
    const im = document.createElement('img'); im.alt=String(id); im.src=idToSrc(id);
    const cap = document.createElement('div'); cap.className='caption'; cap.textContent = "#" + id;
    d.appendChild(im); d.appendChild(cap);
    d.addEventListener('click',()=> go(id));
    return d;
  }

  function onRight(){
    const root = stripSpouse(currentId);
    const partner = spouseMap[root];
    const spouseCandidate = partner || (root + ".1");
    grid.innerHTML=''; title.textContent='Spouse';
    grid.appendChild(tile(spouseCandidate));
    overlay.classList.remove('hidden');
  }
  function onLeft(){
    const list = siblingsOf(currentId);
    grid.innerHTML=''; title.textContent='Siblings';
    if(list.length===0){ title.textContent='Siblings (n/a at this level)'; }
    list.forEach(id=> grid.appendChild(tile(id)));
    overlay.classList.remove('hidden');
  }
  function onDown(){
    const list = childrenOf(currentId);
    grid.innerHTML=''; title.textContent='Children';
    if(list.length===0){ title.textContent='Children (n/a at this level)'; }
    list.forEach(id=> grid.appendChild(tile(id)));
    overlay.classList.remove('hidden');
  }
  function onUp(){
    const p = parentOf(currentId);
    grid.innerHTML=''; title.textContent='Parents';
    if(p){ grid.appendChild(tile(p)); } else { title.textContent='Parents (none)'; }
    overlay.classList.remove('hidden');
  }

  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) closeOverlay(); });

  function startApp(){
    const saved = new URLSearchParams(location.hash.replace('#','')).get('id');
    let startId = saved || (typeof window.prompt==="function" ? window.prompt("Enter starting ID", "100000") : "100000");
    if(!startId || !/^\d{5,8}(\.\d+)?$/.test(String(startId))) startId = "100000";
    showAnchor(startId);
  }
  window.addEventListener('load', startApp);
})();