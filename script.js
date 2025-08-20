// SwipeTree — GitHub Pages friendly build (localStorage labels only)
(function(){
  'use strict';

  const IMAGE_EXT = ".jpg";
  const MAX_PER_GRID = 9;

  const NameStore = {
    async get(id){
      return localStorage.getItem("name:"+id) || "";
    },
    async set(id, name){
      localStorage.setItem("name:"+id, name || "");
    }
  };

  const $ = (q)=>document.querySelector(q);
  const app = {
    backBtn: $('#backBtn'),
    startBtn: $('#startBtn'),
    anchorImg: $('#anchorImg'),
    anchorCaption: $('#anchorCaption'),
    gridOverlay: $('#gridOverlay'),
    grid: $('#grid'),
    gridTitle: $('#gridTitle'),
    closeGrid: $('#closeGrid'),
    editOverlay: $('#editOverlay'),
    nameInput: $('#nameInput'),
    saveEdit: $('#saveEdit'),
    cancelEdit: $('#cancelEdit'),
  };

  let anchorId = getHashId() || "100000";
  const historyStack = [];
  let editingId = null;

  function getHashId(){
    const m = location.hash.match(/id=(\d+(\.\d+)?)/);
    return m ? m[1] : null;
  }
  function setHashId(id){
    history.replaceState(null, "", "#id="+id);
  }
  function imgUrlFor(id){
    return String(id) + IMAGE_EXT + "?v=" + encodeURIComponent(window.BUILD_TAG || "dev");
  }
  function preloadIfExists(id){
    return new Promise((resolve)=>{
      const img = new Image();
      img.onload = ()=>resolve({id, ok:true, src:img.src});
      img.onerror = ()=>resolve({id, ok:false});
      img.src = imgUrlFor(id);
    });
  }

  function childrenOf(id){
    const base = parseInt(String(id).replace(/\D/g,""), 10);
    return Array.from({length:9}, (_,i)=>base+(i+1)*1000);
  }
  function siblingsOf(id){
    const n = parseInt(String(id).replace(/\D/g,""), 10);
    const head = Math.floor(n/1000)*1000;
    return Array.from({length:9}, (_,i)=>head+(i+1)*1000).filter(x=>x!==n);
  }
  function spouseOf(id){
    const s = String(id); return s.includes(".1") ? s.replace(".1","") : s+".1";
  }
  function parentsOf(id){
    const n = parseInt(String(id).replace(/\D/g,""), 10);
    const parent = Math.floor(n/1000)*1000 - 1000;
    return [parent, String(parent)+".1"];
  }

  async function openGrid(kind, ids){
    app.gridTitle.textContent = kind.toUpperCase();
    app.grid.innerHTML = "";
    app.gridOverlay.classList.remove("hidden");

    const probes = await Promise.all(ids.map(preloadIfExists));
    const existing = probes.filter(p=>p.ok).slice(0, MAX_PER_GRID);
    if (existing.length===0){ app.gridOverlay.classList.add("hidden"); return; }

    for (const p of existing){
      const card = document.createElement("div"); card.className="card";
      const im = document.createElement("img"); im.src=p.src; im.alt=String(p.id);
      im.addEventListener("click", ()=>navigateTo(String(p.id)));
      const cap = document.createElement("div"); cap.className="caption";
      NameStore.get(String(p.id)).then(name=>cap.textContent=name||String(p.id));
      card.appendChild(im); card.appendChild(cap);
      app.grid.appendChild(card);
      enableLongPress(im, ()=>startEdit(String(p.id), cap));
    }
  }

  async function renderAnchor(id){
    const probe = await preloadIfExists(id);
    app.anchorImg.src = probe.ok ? probe.src : imgUrlFor("placeholder");
    app.anchorImg.alt = id;
    const name = await NameStore.get(String(id));
    app.anchorCaption.textContent = name || String(id);
    anchorId = String(id); setHashId(anchorId);
  }

  function navigateTo(id){
    historyStack.push(anchorId); closeGrid(); renderAnchor(id);
  }
  function goBack(){
    if (!app.gridOverlay.classList.contains("hidden")){ closeGrid(); return; }
    const prev=historyStack.pop(); if(prev) renderAnchor(prev);
  }
  function closeGrid(){ app.gridOverlay.classList.add("hidden"); app.grid.innerHTML=""; }

  function enableLongPress(el, onFire){
    let timer=null;
    const start=()=>{ timer=setTimeout(onFire,520); };
    const cancel=()=>{ if(timer){clearTimeout(timer);timer=null;} };
    el.addEventListener('touchstart', start, {passive:true});
    el.addEventListener('touchend', cancel, {passive:true});
    el.addEventListener('touchmove', cancel, {passive:true});
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
    el.addEventListener('contextmenu', e=>e.preventDefault());
  }
  function startEdit(id, captionEl){
    editingId=id;
    app.editOverlay.classList.remove("hidden");
    app.nameInput.value=captionEl?captionEl.textContent:"";
    app.nameInput.focus();
    app.saveEdit.onclick=async()=>{
      const val=app.nameInput.value.trim();
      await NameStore.set(id,val);
      if(String(anchorId)===String(id)) app.anchorCaption.textContent=val||id;
      if(captionEl) captionEl.textContent=val||id;
      app.editOverlay.classList.add("hidden"); editingId=null;
    };
    app.cancelEdit.onclick=()=>{ app.editOverlay.classList.add("hidden"); editingId=null; };
  }
  enableLongPress(app.anchorImg, ()=>startEdit(anchorId, app.anchorCaption));

  (function bindSwipes(){
    let sx=0, sy=0, t0=0; const THRESH=30, TIME=600;
    function pt(e){return e.touches?e.touches[0]:e.changedTouches?e.changedTouches[0]:e;}
    document.addEventListener('touchstart',e=>{const p=pt(e);sx=p.clientX;sy=p.clientY;t0=Date.now();},{passive:true});
    document.addEventListener('touchend',e=>{
      const p=pt(e),dx=p.clientX-sx,dy=p.clientY-sy,dt=Date.now()-t0;
      if(dt>TIME) return; if(Math.max(Math.abs(dx),Math.abs(dy))<THRESH) return;
      if(Math.abs(dx)>Math.abs(dy)){ if(dx>0)openGrid("spouse",[spouseOf(anchorId)]); else openGrid("siblings",siblingsOf(anchorId)); }
      else{ if(dy<0)openGrid("parents",parentsOf(anchorId)); else openGrid("children",childrenOf(anchorId)); }
    },{passive:true});
    let ms=null; document.addEventListener('mousedown',e=>{ms={x:e.clientX,y:e.clientY,t:Date.now()};});
    document.addEventListener('mouseup',e=>{if(!ms)return;const dx=e.clientX-ms.x,dy=e.clientY-ms.y,dt=Date.now()-ms.t;ms=null;
      if(dt>TIME)return;if(Math.max(Math.abs(dx),Math.abs(dy))<THRESH)return;
      if(Math.abs(dx)>Math.abs(dy)){if(dx>0)openGrid("spouse",[spouseOf(anchorId)]);else openGrid("siblings",siblingsOf(anchorId));}
      else{if(dy<0)openGrid("parents",parentsOf(anchorId));else openGrid("children",childrenOf(anchorId));}});
  })();

  app.closeGrid.addEventListener('click', closeGrid);
  app.backBtn.addEventListener('click', goBack);
  app.startBtn.addEventListener('click', ()=>renderAnchor(getHashId()||anchorId));

  renderAnchor(anchorId);
})();