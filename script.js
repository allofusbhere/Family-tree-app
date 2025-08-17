// JS is identical to the No-Regression build except for build tag text
(function(){
  const BUILD_TAG = (new Date().toISOString().slice(0,19).replace('T',' '));
  const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
  const EXTENSIONS = ['.jpg', '.JPG'];
  const KNOWN_BRANCHES = new Set(['1','2','3','4','5','6','7','8','9']);

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

  function urlFor(stem, i=0){ return IMAGE_BASE + stem + EXTENSIONS[i]; }
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

  function spouseCandidates(aId){
    const branches=[firstDigit(aId)];
    for (let d=1; d<=2; d++){
      const up = String((parseInt(branches[0],10)+d-1)%9 + 1);
      if (!branches.includes(up)) branches.push(up);
    }
    const candIds=[];
    for(const b of branches){ for(let k=1;k<=9;k++){ candIds.push(`${b}${k}0000`);} }
    const paths=[];
    for(const cid of candIds){
      paths.push({kind:'linked', partnerId:cid, stem:`${aId}.1.${cid}`});
      paths.push({kind:'linked', partnerId:cid, stem:`${cid}.1.${aId}`});
    }
    paths.push({kind:'dot1', partnerId:`${aId}.1`, stem:`${aId}.1`});
    return paths;
  }

  async function actionSpouse(){
    showGrid(gridSpouse);
    const wrap = gridSpouse.querySelector('.grid-wrap');
    wrap.innerHTML='';
    const trials = spouseCandidates(anchorId);
    let chosen=null, imgUrl=null;
    for(const t of trials){
      for (let i=0;i<EXTENSIONS.length;i++){
        const url = urlFor(t.stem, i) + '?cb=' + Date.now();
        const ok = await new Promise(res=>{ const im=new Image(); im.onload=()=>res(true); im.onerror=()=>res(false); im.src=url; });
        if (ok){ chosen=t; imgUrl=url; break; }
      }
      if (chosen) break;
    }
    if (!chosen){
      const d=document.createElement('div'); d.className='badge'; d.textContent='No spouse/partner found'; wrap.appendChild(d); return;
    }
    const id = chosen.partnerId;
    const cell=document.createElement('div'); cell.className='cell';
    const img=document.createElement('img'); img.src=imgUrl; img.alt=id;
    const tag=document.createElement('div'); tag.className='tag';
    tag.textContent = (chosen.kind==='linked') ? (names[id]||id) : (names[anchorId]? `${names[anchorId]} • partner` : `${anchorId} • partner`);
    cell.appendChild(img); cell.appendChild(tag); wrap.appendChild(cell);
    img.addEventListener('click', ()=>{
      if (chosen.kind==='linked' && /^\d{6}$/.test(id) && isTraceableId(id)){ setAnchor(id); }
    });
    const editKey = /^\d{6}$/.test(id) ? id : anchorId; attachSoftEdit(img, editKey);
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

  async function actionParents(){
    showGrid(gridParents);
    const wrap = gridParents.querySelector('.grid-wrap'); wrap.innerHTML='';
    const p = computeParentId(anchorId);
    if (!p){ const d=document.createElement('div'); d.className='badge'; d.textContent='No parent'; wrap.appendChild(d); return; }
    await populateGrid(gridParents, [p]);
  }
  async function actionChildren(){ showGrid(gridChildren); await populateGrid(gridChildren, buildChildrenFor(anchorId)); }
  async function actionSiblings(){ showGrid(gridSiblings); await populateGrid(gridSiblings, buildSiblingsFor(anchorId)); }

  let sx=0, sy=0, active=false; const TH=40;
  function onStart(e){ const t=e.touches?e.touches[0]:e; sx=t.clientX; sy=t.clientY; active=true; }
  function onEnd(e){
    if(!active) return; active=false;
    const t=e.changedTouches?e.changedTouches[0]:e; const dx=t.clientX-sx; const dy=t.clientY-sy;
    if (Math.abs(dx)<TH && Math.abs(dy)<TH) return;
    if (Math.abs(dx)>Math.abs(dy)){ if (dx>0) actionSpouse(); else actionSiblings(); }
    else { if (dy<0) actionParents(); else actionChildren(); }
  }
  document.addEventListener('touchstart', onStart, {passive:true});
  document.addEventListener('touchend', onEnd, {passive:true});
  document.addEventListener('mousedown', onStart);
  document.addEventListener('mouseup', onEnd);

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