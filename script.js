// SwipeTree v5s4: generalized generation math + history + hide missing tiles
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

  const idToSrc = (idLike)=> IMAGES_BASE_URL + String(idLike) + ".jpg";
  const core = (id)=> String(id).split('.')[0];

  function trailingZeros(idStr){
    let s = core(idStr);
    let c = 0;
    for(let i=s.length-1; i>=0; i--){
      if(s[i]==='0') c++; else break;
    }
    return c;
  }

  function stepForLevel(z){ return Math.pow(10, Math.max(0, z-1)); } // children step
  function placeValue(z){ return Math.pow(10, z); } // current digit place value

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

  // Gestures
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

  // spouse map
  let spouseMap = {};
  fetch('spouse_link.json', {cache:'no-store'}).then(r=>r.json()).then(data=>{
    data.forEach(p=>{
      spouseMap[String(p.a)] = String(p.b);
      spouseMap[String(p.b)] = String(p.a);
    });
  }).catch(()=>{});

  // Math helpers
  function siblingsOf(idStr){
    const s = core(idStr);
    if(!/^\d{5,8}$/.test(s)) return [];
    const n = Number(s);
    const z = trailingZeros(s);
    const curPlace = placeValue(z);      // e.g., 10000 for 140000, 1000 for 142000
    const nextHigher = curPlace*10;      // span for this digit
    const base = Math.floor(n/nextHigher)*nextHigher;
    const currentDigit = Math.floor((n % nextHigher)/curPlace);
    const out = [];
    for(let d=1; d<=9; d++){
      if(d===currentDigit) continue;
      out.push(base + d*curPlace);
    }
    return out;
  }

  function childrenOf(idStr){
    const s = core(idStr);
    if(!/^\d{5,8}$/.test(s)) return [];
    const n = Number(s);
    const z = trailingZeros(s);
    if(z<=0) return [];
    const childStep = stepForLevel(z);   // e.g., 1000 for 140000, 100 for 141000, 10 for 141100
    const out = [];
    for(let d=1; d<=9; d++){ out.push(n + d*childStep); }
    return out;
  }

  function parentOf(idStr){
    const s = core(idStr);
    if(!/^\d{5,8}$/.test(s)) return null;
    const n = Number(s);
    const z = trailingZeros(s);
    const curPlace = placeValue(z);
    const parent = Math.floor(n/curPlace)*curPlace; // zero current digit
    // If already at top (e.g., 100000) parent would be itself; return null instead
    if(parent===n) {
      // try zeroing next higher place once
      const higher = curPlace*10;
      const top = Math.floor(n/higher)*higher;
      return top===n ? null : top;
    }
    return parent;
  }

  function tile(id){
    const d = document.createElement('div'); d.className='tile';
    const im = document.createElement('img'); im.alt=String(id); im.src=idToSrc(id);
    const cap = document.createElement('div'); cap.className='caption'; cap.textContent = "#" + id;
    d.appendChild(im); d.appendChild(cap);
    d.addEventListener('click',()=> go(id));
    // Hide tile if image missing
    im.addEventListener('error', ()=>{
      d.remove();
      // If grid empties out, show a note
      if(!grid.children.length){ title.textContent += " (no images found)"; }
    });
    return d;
  }

  function onRight(){
    const root = core(currentId);
    const partner = spouseMap[root];
    const spouseCandidate = partner || (root + ".1");
    grid.innerHTML=''; title.textContent='Spouse';
    grid.appendChild(tile(spouseCandidate));
    overlay.classList.remove('hidden');
  }
  function onLeft(){
    const list = siblingsOf(currentId);
    grid.innerHTML=''; title.textContent='Siblings';
    list.forEach(id=> grid.appendChild(tile(id)));
    if(!list.length) title.textContent='Siblings (none at this level)';
    overlay.classList.remove('hidden');
  }
  function onDown(){
    const list = childrenOf(currentId);
    grid.innerHTML=''; title.textContent='Children';
    list.forEach(id=> grid.appendChild(tile(id)));
    if(!list.length) title.textContent='Children (none at this level)';
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