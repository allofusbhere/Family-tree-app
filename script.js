
// Spouse Toggle build: one spouse per anchor; Right flips spouse <-> anchor
(function(){
  const BUILD_TAG = (new Date().toISOString().slice(0,19).replace('T',' '));
  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const EXTENSIONS = ['.jpg', '.JPG'];
  const KNOWN_BRANCHES = new Set(['1','2','3','4','5','6','7','8','9']);

  const stage = document.getElementById('stage');
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

  let historyStack = [];
  let anchorId = '100000';
  let names = JSON.parse(localStorage.getItem('swipetree_names') || '{}');

  // Spouse choice cache and toggle state
  const spouseChoice = {}; // { [anchorId]: { kind, partnerId, url } }
  const spouseShown = {};  // { [anchorId]: boolean }

  function urlFor(stem, i=0){ return IMAGE_BASE + stem + EXTENSIONS[i]; }
  async function probeUrl(stem){
    for (let i=0;i<EXTENSIONS.length;i++){
      const url = urlFor(stem, i) + '?cb=' + Date.now();
      const ok = await new Promise(res=>{ const im=new Image(); im.onload=()=>res(true); im.onerror=()=>res(false); im.src=url; });
      if (ok) return url;
    }
    return null;
  }
  function setImgWithFallback(img, stem){
    let i=0;
    const tryNext=()=>{
      if (i>=EXTENSIONS.length){ img.dataset.failed='1'; return; }
      img.src = urlFor(stem, i) + '?cb=' + Date.now();
      i++;
    };
    img.onerror = tryNext;
    tryNext();
  }

  function firstDigit(id){ return String(id)[0]; }
  function isTraceableId(id){ return KNOWN_BRANCHES.has(firstDigit(id)); }

  let pressTimer;
  function attachSoftEdit(el, id){
    el.addEventListener('touchstart', ()=>{
      pressTimer = setTimeout(()=>{
        const current = names[id] || '';
        const next = prompt('Edit name (SoftEdit):', current);
        if (next!==null){
          names[id] = next.trim();
          localStorage.setItem('swipetree_names', JSON.stringify(names));
          if (id===anchorId) renderAnchor();
        }
      }, 600);
    }, {passive:true});
    ['touchend','mouseup','mouseleave'].forEach(ev=> el.addEventListener(ev, ()=>clearTimeout(pressTimer), {passive:true}));
    el.addEventListener('mousedown', ()=>{
      pressTimer = setTimeout(()=>{
        const current = names[id] || '';
        const next = prompt('Edit name (SoftEdit):', current);
        if (next!==null){
          names[id] = next.trim();
          localStorage.setItem('swipetree_names', JSON.stringify(names));
          if (id===anchorId) renderAnchor();
        }
      }, 600);
    });
  }

  function renderAnchor(){
    setImgWithFallback(anchorImg, anchorId);
    anchorLabel.textContent = names[anchorId] || anchorId;
    spouseShown[anchorId] = false; // reset toggle for this anchor
  }

  function hideAllGrids(){ grids.forEach(g=>g.classList.add('hidden')); anchorWrap.style.visibility='visible'; }
  function showGrid(g){ grids.forEach(x=>x.classList.add('hidden')); g.classList.remove('hidden'); anchorWrap.style.visibility='hidden'; }

  function pushHistory(id){
    if (!historyStack.length || historyStack[historyStack.length-1] !== id){
      historyStack.push(id);
      try{ history.replaceState(null,'','#'+id); }catch{}
    }
  }
  function setAnchor(id){ pushHistory(anchorId); anchorId=id; hideAllGrids(); renderAnchor(); }

  function childStepFor(parentId){
    const s = String(parentId);
    if (/^\d00000$/.test(s)) return 10000;
    if (/^\d\d0000$/.test(s)) return 1000;
    if (/^\d\d\d000$/.test(s)) return 100;
    if (/^\d\d\d\d00$/.test(s)) return 10;
    if (/^\d\d\d\d\d0$/.test(s)) return 1;
    return 0;
  }
  function computeParentId(id){
    const s = String(id);
    if (/^\d00000$/.test(s)) return null;
    if (/^\d\d0000$/.test(s)) return s[0] + '00000';
    if (/^\d\d\d000$/.test(s)) return s.slice(0,2) + '0000';
    if (/^\d\d\d\d00$/.test(s)) return s.slice(0,3) + '000';
    if (/^\d\d\d\d\d0$/.test(s)) return s.slice(0,4) + '00';
    return null;
  }
  function buildChildrenFor(parentId, max=9){
    const step = childStepFor(parentId);
    const base = parseInt(parentId,10);
    const out = [];
    if (!step) return out;
    for (let i=1;i<=max;i++){ out.push(String(base + i*step).padStart(6,'0')); }
    return out;
  }
  function buildSiblingsFor(id){
    const p = computeParentId(id);
    if (!p) return [];
    return buildChildrenFor(p).filter(x => x !== id);
  }

  function spouseCandidateStems(aId){
    const branches=[firstDigit(aId)];
    for (let d=1; d<=2; d++){
      const up = String((parseInt(branches[0],10)+d-1)%9 + 1);
      if (!branches.includes(up)) branches.push(up);
    }
    const candIds=[];
    for(const b of branches){ for(let k=1;k<=9;k++){ candIds.push(`${b}${k}0000`);} }
    const stems=[];
    // Priority A.1.B first (exact forward), then B.1.A (reciprocal), then A.1 partner-only
    for(const cid of candIds){ stems.push({kind:'linked', partnerId:cid, stem:`${aId}.1.${cid}`}); }
    for(const cid of candIds){ stems.push({kind:'linked', partnerId:cid, stem:`${cid}.1.${aId}`}); }
    stems.push({kind:'dot1', partnerId:`${aId}.1`, stem:`${aId}.1`});
    return stems;
  }

  async function pickBestSpouse(aId){
    const cached = spouseChoice[aId];
    if (cached) return cached;
    const stems = spouseCandidateStems(aId);
    for (const t of stems){
      const url = await probeUrl(t.stem);
      if (url){ spouseChoice[aId] = { kind:t.kind, partnerId:t.partnerId, url }; return spouseChoice[aId]; }
    }
    spouseChoice[aId] = null;
    return null;
  }

  async function actionSpouse(){
    // Toggle: if spouse currently shown, go back to anchor view
    if (spouseShown[anchorId]){
      hideAllGrids();
      spouseShown[anchorId] = false;
      return;
    }
    // Otherwise show (or find) the one spouse for this anchor
    const chosen = await pickBestSpouse(anchorId);
    showGrid(gridSpouse);
    const wrap = gridSpouse.querySelector('.grid-wrap');
    wrap.innerHTML='';
    if (!chosen){
      const d=document.createElement('div'); d.className='badge'; d.textContent='No spouse/partner found'; wrap.appendChild(d);
      spouseShown[anchorId] = true; // stays in spouse view to prevent flip loop
      return;
    }
    const cell=document.createElement('div'); cell.className='cell';
    const img=document.createElement('img'); img.src=chosen.url; img.alt=chosen.partnerId;
    const tag=document.createElement('div'); tag.className='tag';
    tag.textContent = (chosen.kind==='linked') ? (names[chosen.partnerId]||chosen.partnerId) : (names[anchorId]? f`${names[anchorId]} • partner` : `${anchorId} • partner`);
    cell.appendChild(img); cell.appendChild(tag); wrap.appendChild(cell);
    spouseShown[anchorId] = true;

    // Tap navigates if linked & traceable, and resets toggle for new anchor
    img.addEventListener('click', ()=>{
      if (chosen.kind==='linked' && /^\d{6}$/.test(chosen.partnerId) && isTraceableId(chosen.partnerId)){
        setAnchor(chosen.partnerId);
      }
    });
  }

  async function populateGrid(gridEl, ids){
    const wrap = gridEl.querySelector('.grid-wrap');
    wrap.innerHTML='';
    for (const id of ids){
      const cell=document.createElement('div'); cell.className='cell';
      const img=document.createElement('img'); setImgWithFallback(img, id); img.alt=id;
      img.onload=()=>{ if (img.dataset.failed==='1') cell.remove(); };
      const tag=document.createElement('div'); tag.className='tag'; tag.textContent=names[id]||id;
      cell.appendChild(img); cell.appendChild(tag); wrap.appendChild(cell);
      img.addEventListener('click', ()=>{ if (img.dataset.failed!=='1'){ setAnchor(id); hideAllGrids(); } });
      attachSoftEdit(img, id);
    }
  }

  async function actionParents(){ showGrid(gridParents); await populateGrid(gridParents, computeParentId(anchorId)?[computeParentId(anchorId)]:[]); }
  async function actionChildren(){ showGrid(gridChildren); await populateGrid(gridChildren, buildChildrenFor(anchorId)); }
  async function actionSiblings(){ showGrid(gridSiblings); await populateGrid(gridSiblings, buildSiblingsFor(anchorId)); }

  // Gesture lock
  let sx=0, sy=0, dir=null, moved=false;
  const LOCK_DIST = 12, H_THRESH = 50, V_THRESH = 50, OFF_AXIS_MAX = 30;
  function onStart(e){ const t=e.touches?e.touches[0]:e; sx=t.clientX; sy=t.clientY; dir=null; moved=false; }
  function onMove(e){
    const t=e.touches?e.touches[0]:e; const dx=t.clientX-sx, dy=t.clientY-sy;
    if (!dir){
      if (Math.abs(dx) > LOCK_DIST || Math.abs(dy) > LOCK_DIST){
        dir = (Math.abs(dx) >= Math.abs(dy)*1.2) ? 'h' : (Math.abs(dy) >= Math.abs(dx)*1.2 ? 'v' : null);
      }
    }
    if (dir){ e.preventDefault(); moved=true; }
  }
  function onEnd(e){
    if (!moved){ dir=null; return; }
    const t=e.changedTouches?e.changedTouches[0]:e; const dx=t.clientX-sx, dy=t.clientY-sy;
    if (dir==='h'){
      if (Math.abs(dx) >= H_THRESH && Math.abs(dy) <= OFF_AXIS_MAX){
        if (dx>0) actionSpouse(); else actionSiblings();
      }
    } else if (dir==='v'){
      if (Math.abs(dy) >= V_THRESH && Math.abs(dx) <= OFF_AXIS_MAX){
        if (dy<0) actionParents(); else actionChildren();
      }
    }
    dir=null; moved=false;
  }
  stage.addEventListener('touchstart', onStart, {passive:false});
  stage.addEventListener('touchmove', onMove, {passive:false});
  stage.addEventListener('touchend', onEnd, {passive:false});
  stage.addEventListener('pointerdown', onStart);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onEnd);
  stage.addEventListener('mousedown', onStart);
  stage.addEventListener('mousemove', onMove);
  stage.addEventListener('mouseup', onEnd);

  startBtn.addEventListener('click', ()=>{
    const val = prompt('Enter starting ID (6 digits):', anchorId);
    if (val && /^\d{6}$/.test(val)){ historyStack=[]; anchorId=val; renderAnchor(); }
  });
  backBtn.addEventListener('click', ()=>{
    if (grids.some(g=>!g.classList.contains('hidden'))){ hideAllGrids(); return; }
    const prev=historyStack.pop(); if (prev){ anchorId=prev; renderAnchor(); }
  });

  window.addEventListener('hashchange', ()=>{
    const id=(location.hash||'').replace('#',''); if (/^\d{6}$/.test(id)) setAnchor(id);
  });
  renderAnchor(); hideAllGrids();
})();