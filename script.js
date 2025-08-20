// SwipeTree — Clean grids + SoftEdit labels (local-first with remote-ready)
(function(){
  'use strict';

  // ====== Config ======
  const IMAGE_EXT = ".jpg"; // flat folder images like 140000.jpg or 140000.1.jpg
  const MAX_PER_GRID = 9;

  // ====== Storage Adapter (local-first; remote optional) ======
  const NETLIFY_FUNCTION_URL = window.NETLIFY_FUNCTION_URL || null;

  const NameStore = {
    async get(id){
      const key = "name:"+id;
      // remote (optional, if user wires it)
      if (NETLIFY_FUNCTION_URL){
        try{
          const r = await fetch(NETLIFY_FUNCTION_URL+"/getName?id="+encodeURIComponent(id), {cache:"no-store"});
          if (r.ok){ const data = await r.json(); if (data && typeof data.name==="string") return data.name; }
        }catch(e){ /* fall through to local */ }
      }
      // local
      return localStorage.getItem(key) || "";
    },
    async set(id, name){
      const key = "name:"+id;
      // remote
      if (NETLIFY_FUNCTION_URL){
        try{
          await fetch(NETLIFY_FUNCTION_URL+"/setName", {
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body: JSON.stringify({ id, name })
          });
        }catch(e){ /* ignore */ }
      }
      // local (always persist locally so labels show immediately)
      localStorage.setItem(key, name || "");
    }
  };

  // ====== DOM ======
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

  // ====== State ======
  let anchorId = getHashId() || "100000";           // default
  const historyStack = [];
  let longPressTimer = null;
  let editingId = null;
  let currentGridKind = null;

  // ====== Utils ======
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
    // returns a Promise that resolves to {id, ok, img}
    return new Promise((resolve)=>{
      const img = new Image();
      img.onload = ()=>resolve({id, ok:true, img});
      img.onerror = ()=>resolve({id, ok:false, img:null});
      img.src = imgUrlFor(id);
    });
  }

  // ID math helpers based on user's rules:
  // Children: parent + (order * 1000) -> 1..9 => +1000, +2000, ...
  // Siblings: same parent block: e.g., share higher digits, vary the child digit place.
  function childrenOf(id){
    const base = parseInt(String(id).replace(/\D/g,""), 10);
    const kids = [];
    for (let n=1;n<=9;n++){
      kids.push(base + n*1000);
    }
    return kids;
  }
  function siblingsOf(id){
    const n = parseInt(String(id).replace(/\D/g,""), 10);
    const parentBlock = Math.floor(n / 1000) * 1000; // zero out child digit place
    const sibs = [];
    for (let b=1;b<=9;b++){
      sibs.push(parentBlock + b*1000);
    }
    // remove self if present
    return sibs.filter(x=>x!==n);
  }
  function spouseOf(id){
    // Toggle .1 suffix
    const s = String(id);
    return s.includes(".1") ? s.replace(".1","") : s + ".1";
  }
  function parentsOf(id){
    // Up swipe reserved for parents grid: Based on generation logic, parent is the block above
    // Example: for 141000 -> parent 140000 (zero out the 1000s place)
    const n = parseInt(String(id).replace(/\D/g,""), 10);
    const parent = Math.floor(n/1000)*1000 - 1000; // previous block head (e.g., 141000 -> 140000)
    // Show up to two parents if images exist: parent and parent spouse (.1)
    return [parent, String(parent)+".1"];
  }

  // Build a grid with only IDs that exist (suppress unused slots)
  async function openGrid(kind, ids){
    currentGridKind = kind;
    app.gridTitle.textContent = kind.toUpperCase();
    app.grid.innerHTML = "";
    app.gridOverlay.classList.remove("hidden");

    // Probe existence
    const probes = await Promise.all(ids.map(preloadIfExists));
    const existing = probes.filter(p=>p.ok).slice(0, MAX_PER_GRID);

    // If nothing exists, just close
    if (existing.length===0){
      app.gridOverlay.classList.add("hidden");
      return;
    }

    for (const item of existing){
      const card = document.createElement("div");
      card.className = "card";
      const im = document.createElement("img");
      im.src = item.img.src;
      im.alt = String(item.id);
      im.draggable = false;
      im.addEventListener("click", ()=>navigateTo(String(item.id)));

      const cap = document.createElement("div");
      cap.className = "caption";
      cap.textContent = ""; // filled by label loader

      card.appendChild(im);
      card.appendChild(cap);
      app.grid.appendChild(card);

      // Load name labels
      NameStore.get(String(item.id)).then(name=>{
        cap.textContent = name || String(item.id);
      });
      // Long-press edit on grid item
      enableLongPress(im, ()=>startEdit(String(item.id), cap));
    }
  }

  async function renderAnchor(id){
    anchorId = String(id);
    setHashId(anchorId);
    const probe = await preloadIfExists(anchorId);
    app.anchorImg.src = probe.ok ? probe.img.src : imgUrlFor("placeholder");
    app.anchorImg.alt = anchorId;
    // load caption
    const name = await NameStore.get(anchorId);
    app.anchorCaption.textContent = name || anchorId;
  }

  function navigateTo(id){
    historyStack.push(anchorId);
    closeGrid();
    renderAnchor(id);
  }

  function goBack(){
    if (app.gridOverlay && !app.gridOverlay.classList.contains("hidden")){
      closeGrid();
      return;
    }
    const last = historyStack.pop();
    if (last){
      renderAnchor(last);
    }
  }

  function closeGrid(){
    app.gridOverlay.classList.add("hidden");
    app.grid.innerHTML = "";
    currentGridKind = null;
  }

  // ====== SoftEdit (Long-press) ======
  function enableLongPress(el, onFire){
    const start = (e)=>{
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = setTimeout(()=>{
        onFire();
      }, 520);
    };
    const cancel = ()=>{
      if (longPressTimer){ clearTimeout(longPressTimer); longPressTimer = null; }
    };
    el.addEventListener('touchstart', start, {passive:true});
    el.addEventListener('touchend', cancel, {passive:true});
    el.addEventListener('touchmove', cancel, {passive:true});
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
    // prevent context-menu on long press
    el.addEventListener('contextmenu', (e)=>e.preventDefault());
  }

  function startEdit(id, captionEl){
    editingId = id;
    app.editOverlay.classList.remove("hidden");
    app.nameInput.value = captionEl ? captionEl.textContent.replace(id,"").trim() : "";
    app.nameInput.focus();
    app.saveEdit.onclick = async ()=>{
      const value = app.nameInput.value.trim();
      await NameStore.set(editingId, value);
      // Update captions (anchor or grid item)
      if (String(anchorId) === String(editingId)){
        app.anchorCaption.textContent = value || editingId;
      }
      if (captionEl){
        captionEl.textContent = value || editingId;
      }
      app.editOverlay.classList.add("hidden");
      editingId = null;
    };
    app.cancelEdit.onclick = ()=>{
      app.editOverlay.classList.add("hidden");
      editingId = null;
    };
  }

  // Enable long-press on anchor
  enableLongPress(app.anchorImg, ()=>startEdit(anchorId, app.anchorCaption));

  // ====== Swipes ======
  // Simple swipe detector for four directions
  (function bindSwipes(){
    let sx=0, sy=0, ex=0, ey=0, t0=0;
    const THRESH=30, TIME=600;

    function onStart(e){
      const t = e.touches ? e.touches[0] : e;
      sx = t.clientX; sy = t.clientY; t0 = Date.now();
    }
    function onEnd(e){
      const t = e.changedTouches ? e.changedTouches[0] : e;
      ex = t.clientX; ey = t.clientY;
      const dx = ex - sx, dy = ey - sy, dt = Date.now()-t0;
      if (dt>TIME) return;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < THRESH) return;
      if (Math.abs(dx) > Math.abs(dy)){
        if (dx>0){
          // Right → spouse
          const id = spouseOf(anchorId);
          openGrid("spouse", [id]);
        }else{
          // Left → siblings
          openGrid("siblings", siblingsOf(anchorId));
        }
      }else{
        if (dy<0){
          // Up → parents
          openGrid("parents", parentsOf(anchorId));
        }else{
          // Down → children
          openGrid("children", childrenOf(anchorId));
        }
      }
    }
    document.addEventListener('touchstart', onStart, {passive:true});
    document.addEventListener('touchend', onEnd, {passive:true});
    document.addEventListener('mousedown', onStart);
    document.addEventListener('mouseup', onEnd);
  })();

  // ====== Click binds ======
  app.closeGrid.addEventListener('click', closeGrid);
  app.backBtn.addEventListener('click', goBack);
  app.startBtn.addEventListener('click', ()=>renderAnchor(getHashId() || anchorId));

  // Init
  renderAnchor(anchorId);
})();