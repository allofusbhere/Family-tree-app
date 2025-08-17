
// SwipeTree — Spouse/Partner Traceability Build (Images from image repo)
(function(){
  const BUILD_TAG = (window.__SWIPETREE_BUILD__ || new Date().toISOString().slice(0,19).replace('T',' '));
  const IMG_EXT = '.jpg';
  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const KNOWN_BRANCHES = new Set(['1','2','3','4','5','6','7','8','9']);

  // ---- Elements ----
  const anchorImg = document.getElementById('anchorImg');
  const anchorLabel = document.getElementById('anchorLabel');
  const anchorWrap = document.getElementById('anchorWrap');
  const buildTag = document.getElementById('buildTag');
  const startBtn = document.getElementById('startBtn');
  const backBtn = document.getElementById('backBtn');

  const gridParents = document.getElementById('gridParents');
  const gridSiblings = document.getElementById('gridSiblings');
  const gridChildren = document.getElementById('gridChildren');
  const gridSpouse = document.getElementById('gridSpouse');

  const grids = [gridParents, gridSiblings, gridChildren, gridSpouse];

  buildTag.textContent = 'build ' + BUILD_TAG;

  // ---- State ----
  let historyStack = [];
  let anchorId = '100000'; // default
  let names = JSON.parse(localStorage.getItem('swipetree_names') || '{}'); // SoftEdit labels

  function idToPath(id){ return `${IMAGE_BASE}${id}${IMG_EXT}`; }
  function spouseDot1Path(id){ return `${IMAGE_BASE}${id}.1${IMG_EXT}`; } // A.1.jpg
  function spouseLinkedPath(aId,bId){ return `${IMAGE_BASE}${aId}.1.${bId}${IMG_EXT}`; } // A.1.B.jpg
  function firstDigit(id){ return String(id)[0]; }
  function isTraceableId(id){ return KNOWN_BRANCHES.has(firstDigit(id)); }

  function imageExists(path){
    return new Promise((resolve)=>{
      const img = new Image();
      img.onload = ()=> resolve(true);
      img.onerror = ()=> resolve(false);
      img.src = path + '?cb=' + Date.now();
    });
  }

  // ---- SoftEdit (long press) ----
  let pressTimer;
  function attachSoftEdit(el, id){
    el.addEventListener('touchstart', ()=>{
      pressTimer = setTimeout(async ()=>{
        const current = names[id] || '';
        const next = prompt('Edit name (SoftEdit):', current);
        if (next !== null) {
          names[id] = next.trim();
          localStorage.setItem('swipetree_names', JSON.stringify(names));
          if (id === anchorId) renderAnchor();
        }
      }, 600);
    }, {passive:true});
    el.addEventListener('touchend', ()=> clearTimeout(pressTimer), {passive:true});
    el.addEventListener('mousedown', ()=>{
      pressTimer = setTimeout(async ()=>{
        const current = names[id] || '';
        const next = prompt('Edit name (SoftEdit):', current);
        if (next !== null) {
          names[id] = next.trim();
          localStorage.setItem('swipetree_names', JSON.stringify(names));
          if (id === anchorId) renderAnchor();
        }
      }, 600);
    });
    el.addEventListener('mouseup', ()=> clearTimeout(pressTimer));
    el.addEventListener('mouseleave', ()=> clearTimeout(pressTimer));
  }

  function renderAnchor(){
    anchorImg.src = idToPath(anchorId) + '?cb=' + Date.now();
    anchorLabel.textContent = names[anchorId] || anchorId;
  }

  function hideAllGrids(){
    grids.forEach(g => g.classList.add('hidden'));
    anchorWrap.style.visibility = 'visible';
  }
  function showGrid(grid){
    grids.forEach(g => g.classList.add('hidden'));
    grid.classList.remove('hidden');
    anchorWrap.style.visibility = 'hidden';
  }

  function pushHistory(id){
    if (historyStack.length === 0 || historyStack[historyStack.length-1] !== id){
      historyStack.push(id);
      try { history.replaceState(null, '', '#'+id); } catch {}
    }
  }

  function setAnchor(id){
    pushHistory(anchorId);
    anchorId = id;
    hideAllGrids();
    renderAnchor();
  }

  // ---- Relationship math (placeholder hooks) ----
  function computeNparentFromChild(childId){
    const s = String(childId);
    return s.slice(0,3) + '000';
  }

  function buildChildrenFor(parentId, max=9){
    const base = parseInt(parentId,10);
    const kids = [];
    for(let i=1;i<=max;i++){
      const kid = base + i*1000;
      kids.push(String(kid).padStart(6,'0'));
    }
    return kids;
  }

  function buildSiblingsFor(personId, max=9){
    const s = String(personId);
    const parent = s.slice(0,1) + '00000';
    const sibs = [];
    for(let i=1;i<=max;i++){
      const sib = parseInt(parent,10) + i*10000;
      sibs.push(String(sib).padStart(6,'0'));
    }
    return sibs.filter(x=> x!==personId);
  }

  // ---- Spouse/Partner discovery ----
  async function findSpouseFor(aId){
    // Prefer partner-only quick check
    const dot1 = spouseDot1Path(aId);
    if (await imageExists(dot1)){
      return { kind:'dot1', partnerId:`${aId}.1`, path:dot1, traceable:false };
    }
    // Probe likely partners for linked files A.1.B.jpg and reciprocal B.1.A.jpg
    const branches = [firstDigit(aId)];
    for (let d=1; d<=2; d++){
      const up = String((parseInt(firstDigit(aId),10)+d-1)%9 + 1);
      if (!branches.includes(up)) branches.push(up);
    }
    const roughSeeds = [];
    for (const b of branches){
      for (let k=1;k<=9;k++){
        roughSeeds.push(`${b}${k}0000`);
      }
    }
    const tried = new Set();
    for (const cand of roughSeeds){
      if (tried.has(cand)) continue;
      tried.add(cand);
      const linked = spouseLinkedPath(aId, cand);
      if (await imageExists(linked)){
        return { kind:'linked', partnerId:cand, path:linked, traceable:isTraceableId(cand) };
      }
      const reciprocal = spouseLinkedPath(cand, aId);
      if (await imageExists(reciprocal)){
        return { kind:'linked', partnerId:cand, path:reciprocal, traceable:isTraceableId(cand) };
      }
    }
    return null;
  }

  async function getParentsFor(childId){
    const nparentId = computeNparentFromChild(childId);
    const nparentPath = idToPath(nparentId);
    const nparentExists = await imageExists(nparentPath);

    let oparentId = null, oPath = null, oExists = false, trace = false;

    const branches = [firstDigit(nparentId)];
    for (let d=1; d<=2; d++){
      const up = String((parseInt(firstDigit(nparentId),10)+d-1)%9 + 1);
      if (!branches.includes(up)) branches.push(up);
    }
    const seeds = [];
    for (const b of branches){
      for (let k=1;k<=9;k++){
        seeds.push(`${b}${k}0000`);
      }
    }
    for (const cand of seeds){
      const test = spouseLinkedPath(nparentId, cand);
      if (await imageExists(test)){
        oparentId = cand; oPath = test; oExists = true; trace = isTraceableId(cand);
        break;
      }
    }

    return {
      nparent: { id:nparentId, path:nparentPath, exists:nparentExists },
      oparent: { id:oparentId, path:oPath, exists:oExists, traceable:trace }
    };
  }

  // ---- Grid builders ----
  async function populateGrid(gridEl, ids){
    const wrap = gridEl.querySelector('.grid-wrap');
    wrap.innerHTML = '';
    for (const id of ids){
      const p = idToPath(id);
      if (!(await imageExists(p))) continue;
      const cell = document.createElement('div');
      cell.className = 'cell';
      const img = document.createElement('img');
      img.src = p + '?cb=' + Date.now();
      img.alt = id;
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.textContent = names[id] || id;
      cell.appendChild(img);
      cell.appendChild(tag);
      wrap.appendChild(cell);

      img.addEventListener('click', ()=>{
        setAnchor(id);
        hideAllGrids();
      });
      attachSoftEdit(img, id);
    }
  }

  // ---- Actions ----
  async function actionParents(){
    const info = await getParentsFor(anchorId);
    const ids = [];
    if (info.nparent.exists) ids.push(info.nparent.id);
    if (info.oparent.exists) ids.push(info.oparent.id);
    showGrid(gridParents);
    await populateGrid(gridParents, ids.length ? ids : [info.nparent.id]);
  }

  async function actionChildren(){
    const ids = buildChildrenFor(anchorId);
    showGrid(gridChildren);
    await populateGrid(gridChildren, ids);
  }

  async function actionSiblings(){
    const ids = buildSiblingsFor(anchorId);
    showGrid(gridSiblings);
    await populateGrid(gridSiblings, ids);
  }

  async function actionSpouse(){
    const s = await findSpouseFor(anchorId);
    showGrid(gridSpouse);
    const wrap = gridSpouse.querySelector('.grid-wrap');
    wrap.innerHTML = '';
    if (!s){
      const d = document.createElement('div');
      d.className = 'badge';
      d.textContent = 'No spouse/partner found';
      wrap.appendChild(d);
      return;
    }
    const id = (s.kind==='linked') ? s.partnerId : s.partnerId;
    const cell = document.createElement('div');
    cell.className = 'cell';
    const img = document.createElement('img');
    img.src = s.path + '?cb=' + Date.now();
    img.alt = id;
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.textContent = (s.kind==='linked') ? (names[id] || id) : (names[anchorId] ? `${names[anchorId]} • partner` : `${anchorId} • partner`);
    cell.appendChild(img); cell.appendChild(tag);
    wrap.appendChild(cell);

    img.addEventListener('click', ()=>{
      if (s.kind==='linked' && /^\d{6}$/.test(id) && isTraceableId(id)){
        setAnchor(id);
      }
    });
    const editKey = /^\d{6}$/.test(id) ? id : anchorId;
    attachSoftEdit(img, editKey);
  }

  // ---- Gestures ----
  let touchStartX=0, touchStartY=0, touchActive=false;
  const THRESH = 40;
  function onTouchStart(e){
    const t = e.touches ? e.touches[0] : e;
    touchStartX = t.clientX; touchStartY = t.clientY; touchActive=true;
  }
  function onTouchEnd(e){
    if (!touchActive) return;
    touchActive=false;
    const t = e.changedTouches ? e.changedTouches[0] : e;
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) return;
    if (Math.abs(dx) > Math.abs(dy)){
      if (dx > 0) actionSpouse();          // Right
      else actionSiblings();               // Left
    } else {
      if (dy < 0) actionParents();         // Up
      else actionChildren();               // Down
    }
  }
  document.addEventListener('touchstart', onTouchStart, {passive:true});
  document.addEventListener('touchend', onTouchEnd, {passive:true});
  document.addEventListener('mousedown', onTouchStart);
  document.addEventListener('mouseup', onTouchEnd);

  // ---- Buttons ----
  startBtn.addEventListener('click', ()=>{
    const val = prompt('Enter starting ID (6 digits):', anchorId);
    if (val && /^\d{6}$/.test(val)) {
      historyStack = [];
      anchorId = val;
      renderAnchor();
    }
  });
  backBtn.addEventListener('click', ()=>{
    if (grids.some(g=>!g.classList.contains('hidden'))){
      hideAllGrids();
      return;
    }
    const prev = historyStack.pop();
    if (prev) {
      anchorId = prev;
      renderAnchor();
    }
  });

  // ---- Init ----
  window.addEventListener('hashchange', ()=>{
    const id = (location.hash||'').replace('#','');
    if (/^\d{6}$/.test(id)){
      setAnchor(id);
    }
  });

  renderAnchor();
  hideAllGrids();
})();