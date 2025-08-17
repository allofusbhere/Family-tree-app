
// SwipeTree — Spouse/Partner Traceability Build (Img repo + case + children step fix)
(function(){
  const BUILD_TAG = (window.__SWIPETREE_BUILD__ || new Date().toISOString().slice(0,19).replace('T',' '));
  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const EXTENSIONS = ['.jpg', '.JPG']; // probe order
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

  // ---- Paths with extension probing ----
  function pathVariants(stem){ return EXTENSIONS.map(ext => IMAGE_BASE + stem + ext); }

  async function resolveExistingPath(stem){
    for (const url of pathVariants(stem)){
      if (await imageExists(url)) return url;
    }
    return null;
  }

  function firstDigit(id){ return String(id)[0]; }
  function isTraceableId(id){ return KNOWN_BRANCHES.has(firstDigit(id)); }

  function imageExists(url){
    return new Promise((resolve)=>{
      const img = new Image();
      img.onload = ()=> resolve(true);
      img.onerror = ()=> resolve(false);
      img.src = url + '?cb=' + Date.now();
    });
  }

  async function anchorSrc(id){
    const url = await resolveExistingPath(id);
    return url || (IMAGE_BASE + id + EXTENSIONS[0]);
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

  async function renderAnchor(){
    anchorImg.src = (await anchorSrc(anchorId)) + '?cb=' + Date.now();
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

  // ---- Relationship helpers ----

  // Determine step size for children based on trailing zeros of the parent.
  // 100000 -> step 10000 (children 110000..190000)
  // 140000 -> step 1000  (children 141000..149000)
  // 141000 -> step 100   (grandchildren 141100..141900) etc.
  function childStepFor(parentId){
    const s = String(parentId);
    if (/^\d00000$/.test(s)) return 10000;
    if (/^\d\d0000$/.test(s)) return 1000;
    if (/^\d\d\d000$/.test(s)) return 100;
    if (/^\d\d\d\d00$/.test(s)) return 10;
    if (/^\d\d\d\d\d0$/.test(s)) return 1;
    return 0;
  }

  function buildChildrenFor(parentId, max=9){
    const step = childStepFor(parentId);
    const base = parseInt(parentId,10);
    const kids = [];
    if (!step) return kids;
    for(let i=1;i<=max;i++){
      const kid = base + i*step;
      kids.push(String(kid).padStart(6,'0'));
    }
    return kids;
  }

  // ---- Spouse/Partner discovery (with extension probing) ----
  async function findSpouseFor(aId){
    // partner-only A.1.[ext]
    for (const ext of EXTENSIONS){
      const url = IMAGE_BASE + `${aId}.1` + ext;
      if (await imageExists(url)){
        return { kind:'dot1', partnerId:`${aId}.1`, path:url, traceable:false };
      }
    }
    // linked A.1.B[ext] or reciprocal B.1.A[ext]; probe likely B seeds
    const branches = [firstDigit(aId)];
    for (let d=1; d<=2; d++){
      const up = String((parseInt(firstDigit(aId),10)+d-1)%9 + 1);
      if (!branches.includes(up)) branches.push(up);
    }
    const seeds = [];
    for (const b of branches){
      for (let k=1;k<=9;k++){
        seeds.push(`${b}${k}0000`);
      }
    }
    const tried = new Set();
    for (const cand of seeds){
      if (tried.has(cand)) continue;
      tried.add(cand);
      // A.1.B
      for (const ext of EXTENSIONS){
        let url = IMAGE_BASE + `${aId}.1.${cand}` + ext;
        if (await imageExists(url)){
          return { kind:'linked', partnerId:cand, path:url, traceable:isTraceableId(cand) };
        }
        // Reciprocal B.1.A
        url = IMAGE_BASE + `${cand}.1.${aId}` + ext;
        if (await imageExists(url)){
          return { kind:'linked', partnerId:cand, path:url, traceable:isTraceableId(cand) };
        }
      }
    }
    return null;
  }

  // Parents (uses same extension probing via resolveExistingPath for Nparent only)
  async function getParentsFor(childId){
    // NOTE: Keeping your existing numeric parent logic is separate work.
    // This build focuses on spouse + children visibility.
    // Placeholder: zero-out the child step to get Nparent for common cases (141000 -> 140000; 120000 -> 100000)
    const s = String(childId);
    let nparentId = childId;
    if (/^\d\d\d000$/.test(s)) nparentId = s.slice(0,3)+'000';
    else if (/^\d\d0000$/.test(s)) nparentId = s.slice(0,2)+'0000';
    else if (/^\d00000$/.test(s)) nparentId = s[0]+'00000';

    const nparentPath = await resolveExistingPath(nparentId);
    const nparentExists = !!nparentPath;

    // Try to find Oparent via Nparent.1.B
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
    outer: for (const cand of seeds){
      for (const ext of EXTENSIONS){
        const test = IMAGE_BASE + `${nparentId}.1.${cand}` + ext;
        if (await imageExists(test)){
          oparentId = cand; oPath = test; oExists = true; trace = isTraceableId(cand);
          break outer;
        }
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
      const p = await resolveExistingPath(id);
      if (!p) continue;
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
    await populateGrid(gridParents, ids.length ? ids : []);
  }

  async function actionChildren(){
    const ids = buildChildrenFor(anchorId);
    showGrid(gridChildren);
    await populateGrid(gridChildren, ids);
  }

  async function actionSiblings(){
    // placeholder; unchanged from prior builds
    const ids = []; // you can rewire later
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