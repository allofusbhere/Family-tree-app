(function(){
  const IMG_BASE = (window.IMAGE_BASE || "https://allofusbhere.github.io/family-tree-images/").replace(/\/+$/, '/') ;
  const DEFAULT_ID = window.DEFAULT_START_ID || "100000";
  const qs = s => document.querySelector(s);
  const $img = qs('#anchorImg');
  const $label = qs('#anchorLabel');
  const $status = qs('#status');
  const $overlay = qs('#overlay');
  const $grid = qs('#grid');
  const $overlayTitle = qs('#overlayTitle');
  const $start = qs('#startId');
  const $startBtn = qs('#startBtn');
  const $backBtn = qs('#backBtn');
  const $closeBtn = qs('#closeOverlay');

  let historyStack = [];
  let anchorId = null;
  let spouseLinks = null; // optional mapping

  // Try to fetch spouse_links.json if present
  fetch('spouse_links.json').then(r=>r.ok?r.json():null).then(j=>{spouseLinks=j||null}).catch(()=>{});

  function imgUrl(id){
    return IMG_BASE + id + ".jpg";
  }

  async function exists(url){
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return r.ok;
    } catch (e) { return false; }
  }

  async function setAnchor(id, push=true){
    if(!id) return;
    if (push && anchorId) historyStack.push(anchorId);
    anchorId = String(id);
    const url = imgUrl(anchorId);
    $img.src = url;
    $label.textContent = anchorId;
    $status.textContent = "Loaded " + url;
    // focus field with current id
    $start.value = anchorId;
  }

  function openOverlay(title, cells){
    $overlayTitle.textContent = title;
    $grid.innerHTML = '';
    cells.forEach(c=>{
      const d = document.createElement('div');
      d.className = 'cell';
      d.innerHTML = '<img loading="lazy" src="'+imgUrl(c)+'" alt="'+c+'"/><div class="id">'+c+'</div>';
      d.addEventListener('click', ()=>{
        closeOverlay();
        setAnchor(c, true);
      });
      $grid.appendChild(d);
    });
    $overlay.classList.remove('hidden');
  }
  function closeOverlay(){ $overlay.classList.add('hidden'); }

  // === Relationship math (best‑effort per your rules) ===
  function toInt(id){ return parseInt(String(id).split('.')[0],10); }
  function hasSpouseVariant(id){ return String(id).includes('.1'); }

  function childrenOf(id){
    const base = toInt(id);
    const thousands = Math.floor(base/1000)*1000; // zero out last 3 digits
    // child slots 1..9
    let out = [];
    for(let n=1;n<=9;n++){
      out.push(thousands + n*1000);
    }
    return out.map(String);
  }
  function siblingsOf(id){
    const base = toInt(id);
    // vary ten-thousands digit (1..9), zero out lower 4 digits
    const hundredThousands = Math.floor(base/100000); // first digit
    let out = [];
    for(let t=1;t<=9;t++){
      const sib = hundredThousands*100000 + t*10000; // X T 0000
      if (sib !== base) out.push(sib);
    }
    return out.map(String);
  }
  function parentsOf(id){
    const base = toInt(id);
    // parent assumed to be X00000
    const hundredThousands = Math.floor(base/100000);
    const parent = hundredThousands*100000; // e.g., 140000 -> 100000
    if (parent === base) return [];
    return [String(parent)];
  }
  function spouseOf(id){
    const sid = String(id);
    // priority: mapping file
    if (spouseLinks && spouseLinks[sid]) return [String(spouseLinks[sid])];
    // fallback: dot-1 variant if present
    if (!hasSpouseVariant(sid)) return [sid + ".1"];
    // if already .1, try remove .1 as partner
    return [sid.replace(/\.1$/, '')];
  }

  // === Gestures ===
  let touchStartX=0, touchStartY=0, touching=false;
  const THRESH = 40;

  function onTouchStart(e){
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touching = true;
  }
  function onTouchMove(e){
    if(!touching) return;
  }
  function onTouchEnd(e){
    if(!touching) return;
    touching=false;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)){
      if (dx > THRESH) return doSpouse();
      if (dx < -THRESH) return doSiblings();
    } else {
      if (dy < -THRESH) return doParents();
      if (dy > THRESH) return doChildren();
    }
  }

  async function doChildren(){
    openOverlay("Children of " + anchorId, childrenOf(anchorId));
  }
  async function doSiblings(){
    openOverlay("Siblings of " + anchorId, siblingsOf(anchorId));
  }
  async function doParents(){
    const p = parentsOf(anchorId);
    if (p.length) openOverlay("Parents of " + anchorId, p);
  }
  async function doSpouse(){
    openOverlay("Spouse", spouseOf(anchorId));
  }

  // === UI bindings ===
  $startBtn.addEventListener('click', ()=>{
    const v = ($start.value || '').trim();
    setAnchor(v||DEFAULT_ID, true);
  });
  $backBtn.addEventListener('click', ()=>{
    const prev = historyStack.pop();
    if (prev) setAnchor(prev, false);
  });
  $closeBtn.addEventListener('click', closeOverlay);

  // tap highlight
  $img.addEventListener('click', ()=>{
    $img.classList.add('highlight');
    setTimeout(()=> $img.classList.remove('highlight'), 300);
  });

  // Touch/swipe on body
  document.body.addEventListener('touchstart', onTouchStart, {passive:true});
  document.body.addEventListener('touchmove', onTouchMove, {passive:true});
  document.body.addEventListener('touchend', onTouchEnd, {passive:true});

  // Start from hash or default
  const hashId = (location.hash.match(/id=(\d+(?:\.1)?)/)||[])[1];
  setAnchor(hashId || DEFAULT_ID, false);
})();