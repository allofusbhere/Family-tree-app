// SwipeTree Branch Patch 2
(function(){
  const $ = (s)=>document.querySelector(s);
  const anchorImg = $('#anchorImg');
  const grid = $('#grid');
  const gridOverlay = $('#gridOverlay');
  const backBtn = $('#backBtn');

  const IMG_ROOT = 'https://allofusbhere.github.io/family-tree-images';

  const state = { anchorId: null, history: [], gridOpen:false };

  const idToSrc = (id)=> `${IMG_ROOT}/${id}.jpg`;
  const exists = async (url)=>{ try{ const r=await fetch(url,{method:'HEAD',cache:'no-store'}); return r.ok;}catch(e){return false;} };
  const base100k = (id)=> Math.floor(Number(id)/100000)*100000;

  async function setAnchor(id){
    id = String(id);
    if (state.gridOpen) closeGrid();
    if (state.anchorId && state.anchorId !== id) state.history.push(state.anchorId);
    state.anchorId = id;
    anchorImg.src = idToSrc(id);
  }

  // Grid builders that always reference CURRENT anchor base
  async function buildParents(){
    const b = base100k(state.anchorId);
    return [b, b+100000];
  }
  async function buildSiblings(){
    const b = base100k(state.anchorId);
    const out=[];
    for(let k=0;k<=90000;k+=10000){
      const id = String(b+k);
      if(id!==state.anchorId) out.push(id);
    }
    return out;
  }
  async function buildChildren(){
    const anchorNum = Number(state.anchorId);
    const b = base100k(anchorNum);
    const bucket = Math.floor((anchorNum - b)/10000)*10000;
    const out=[];
    for(let k=1000;k<=9000;k+=1000) out.push(String(b+bucket+k));
    return out;
  }

  // Spouse map
  let SPOUSE_MAP = null;
  async function loadSpouseMap(){
    if (SPOUSE_MAP!==null) return SPOUSE_MAP;
    try{
      const res = await fetch('./spouse_links.json?cb=' + Date.now());
      SPOUSE_MAP = res.ok ? await res.json() : {};
    }catch(e){SPOUSE_MAP={};}
    return SPOUSE_MAP;
  }

  async function handleSpouse(){
    const map = await loadSpouseMap();
    const cur = state.anchorId;
    if(map && map[cur]){
      const target = String(map[cur]);
      if(await exists(idToSrc(target))) { await setAnchor(target); return; }
    }
    // Fallback legacy spouse id (A.1) if present
    const legacy = String(base100k(cur)) + '.1';
    if(await exists(idToSrc(legacy))) await setAnchor(legacy);
  }

  // Grid UI
  function openGrid(title, ids){
    grid.innerHTML='';
    ids.forEach(id=>{
      const div=document.createElement('div');
      div.className='tile';
      const img=document.createElement('img');
      img.src=idToSrc(id);
      img.alt=id;
      img.addEventListener('click', ()=>{ setAnchor(id); closeGrid(); });
      div.appendChild(img);
      grid.appendChild(div);
    });
    gridOverlay.classList.remove('hidden');
    state.gridOpen=true;
  }
  function closeGrid(){ state.gridOpen=false; gridOverlay.classList.add('hidden'); }

  document.addEventListener('keydown', async (e)=>{
    if(e.key==='ArrowUp'){ openGrid('Parents', await buildParents()); }
    else if(e.key==='ArrowLeft'){ openGrid('Siblings', await buildSiblings()); }
    else if(e.key==='ArrowDown'){ openGrid('Children', await buildChildren()); }
    else if(e.key==='ArrowRight'){ await handleSpouse(); }
    else if(e.key==='Escape'){ if(state.gridOpen) closeGrid(); else if(state.history.length) setAnchor(state.history.pop()); }
  });
  backBtn.addEventListener('click', ()=>{ if(state.gridOpen) closeGrid(); else if(state.history.length) setAnchor(state.history.pop()); });

  // Init
  const params = new URLSearchParams(location.search);
  const start = params.get('start') || '140000';
  setAnchor(start);
})();