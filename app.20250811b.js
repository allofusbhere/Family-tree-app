/* SwipeTree Night Test Build 20250811e (root drop-in)
   - HOTFIX++: Anchor full-fit (no cropping) — removes parent overflow, uses viewport-based max-height
   - Keeps: on-demand Parents/Children, LEFT=Siblings overlay, RIGHT=Spouse, BACK behavior
*/
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  // Fallback to CDN if the inline IMAGE_BASE_URL is missing/blocked
  const IMAGE_BASE = (typeof window !== "undefined" && (window.IMAGE_BASE_URL || "").trim())
    || "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";

  const stage = $("#stage");
  const parentsGrid = $("#parentsGrid");
  const parentsLane = parentsGrid?.closest?.('.lane');
  const parentsLaneTitle = parentsLane?.querySelector?.('.lane-title');

  const childrenGrid = $("#childrenGrid");
  const childrenLane = childrenGrid?.closest?.('.lane');
  const childrenLaneTitle = childrenLane?.querySelector?.('.lane-title');

  const anchorArea = $("#anchorArea");
  const backBtn = $("#backBtn");
  const startBtn = $("#startBtn");
  const promptModal = $("#promptModal");
  const startInput = $("#startInput");
  const confirmStart = $("#confirmStart");
  const cancelStart = $("#cancelStart");

  const historyStack = [];
  let anchorId = null;
  let spouseViewOf = null;

  // ===== Utilities =====
  function getQueryParam(name) {
    const m = new URLSearchParams(window.location.search).get(name);
    return m ? m.trim() : null;
  }
  function padId(x){ return String(x); }
  function isBaseGeneration(id){ return /^[1-9]0+$/.test(String(id)); }
  function rightmostNonZeroMagnitude(n){
    let s = padId(n);
    for (let i=s.length-1; i>=0; i--) if (s[i] !== "0") return Math.pow(10, s.length-1-i);
    return 0;
  }
  function parentIdOf(id){
    id = Number(id);
    const mag = rightmostNonZeroMagnitude(id);
    if (!mag) return null;
    const divisor = mag*10;
    const parent = id - (id % divisor);
    return parent || null;
  }
  function childStepOf(id){
    id = Number(id);
    const mag = rightmostNonZeroMagnitude(id);
    return mag/10 || 1000;
  }
  function childrenOf(id, max=9){
    const base = Number(id);
    const step = childStepOf(base);
    const divisor = step*10;
    const parentBase = base - (base % divisor);
    const kids = [];
    for (let k=1;k<=max;k++) kids.push(parentBase + k*step);
    return kids;
  }
  function siblingsOf(id){
    const p = parentIdOf(id);
    if (!p) return [];
    return childrenOf(p).filter(x => Number(x)!==Number(id));
  }

  // ===== Image loader (JPG only) =====
  async function loadPersonImageUrl(id, isSpouse=false){
    const stem = isSpouse ? `${String(id)}.1` : `${String(id)}`;
    const url = `${IMAGE_BASE}${stem}.jpg`;
    return new Promise((resolve,reject)=>{
      const img = new Image();
      img.onload = ()=>resolve(url);
      img.onerror = ()=>reject(new Error("not found: "+url));
      img.src = url;
    });
  }

  // ===== Styles: strong full-fit for anchor (and spouse solo) =====
  function ensureAnchorFullFitStyles(){
    if (document.getElementById("stAnchorFullFitStyles")) return;
    const css = document.createElement("style");
    css.id = "stAnchorFullFitStyles";
    css.textContent = `
      /* Make sure no parent clips the anchor image */
      #anchorArea, #anchorArea * { overflow: visible !important; }
      #anchorArea { display:flex; justify-content:center; align-items:flex-start; padding: 8px 0 12px; }

      /* Anchor wrapper */
      #anchorArea .cell {
        background: transparent;
        height: auto;
        max-width: min(92vw, 720px);
        margin: 0 auto;
      }

      /* Full-fit image: scale within viewport without cropping */
      #anchorArea img.person.anchor-fit {
        display: block;
        width: 100%;
        height: auto;
        max-height: calc(100vh - 220px); /* leave room for header/buttons */
        object-fit: contain;
        object-position: center center;
        border-radius: 8px;
      }

      /* Label styling under anchor */
      #anchorArea .label {
        position: relative;
        margin-top: 6px;
        text-align: center;
        background: rgba(255,255,255,.08);
        color: #ddd;
        border-radius: 8px;
        padding: 4px 8px;
        display: inline-block;
      }
    `;
    document.head.appendChild(css);
  }

  async function imgCell(id, {label=null, spouse=false}={}){
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.id = String(id);
    try{
      const url = await loadPersonImageUrl(id, spouse);
      const img = document.createElement("img");
      img.className = "person";
      img.alt = `${id}${spouse?" (spouse)":""}`;
      img.src = url;
      cell.appendChild(img);
    }catch(err){ console.warn(err.message); }
    const cap = document.createElement("div");
    cap.className = "label";
    cap.textContent = label ?? String(id);
    cell.appendChild(cap);
    cell.addEventListener("click", ()=>{ pushHistory(anchorId); spouseViewOf=null; setAnchor(id); if (overlayActive) closeOverlay(); });
    return cell;
  }

  async function renderAnchor(id){
    ensureAnchorFullFitStyles();
    anchorArea.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "cell";
    wrap.dataset.id = String(id);
    try{
      const url = await loadPersonImageUrl(id, false);
      const img = document.createElement("img");
      img.className = "person anchor-fit"; // fit class prevents cropping
      img.alt = String(id);
      img.src = url;
      wrap.appendChild(img);
    }catch(err){ console.warn(err.message); }
    const cap = document.createElement("div");
    cap.className = "label";
    cap.textContent = String(id);
    wrap.appendChild(cap);
    anchorArea.appendChild(wrap);
  }

  // ===== Parents (on-demand) =====
  function showParentsLane(){ if (!parentsLane) return; parentsLaneTitle.textContent="Parents"; parentsLane.classList.remove("hidden"); }
  function hideParentsLane(){ if (!parentsLane) return; parentsLane.classList.add("hidden"); parentsGrid.innerHTML=""; }
  async function renderParents(id){
    parentsGrid.innerHTML = "";
    if (isBaseGeneration(id)) return hideParentsLane();
    const p = parentIdOf(id);
    if (!p) return hideParentsLane();
    showParentsLane();
    parentsGrid.appendChild(await imgCell(p,{label:`${p} (Parent)`}));
    try{ parentsGrid.appendChild(await imgCell(p,{label:`${p}.1 (Parent 2)`, spouse:true})); }catch{}
  }

  // ===== Children (on-demand) =====
  function showChildrenLane(title){ if (!childrenLane) return; childrenLaneTitle.textContent=title; childrenLane.classList.remove("hidden"); }
  function hideChildrenLane(){ if (!childrenLane) return; childrenLane.classList.add("hidden"); childrenGrid.innerHTML=""; }
  async function renderChildren(id){
    showChildrenLane("Children");
    childrenGrid.innerHTML="";
    for (const kid of childrenOf(id)) childrenGrid.appendChild(await imgCell(kid,{label:`${kid} (Child)`}));
  }

  // ===== Siblings Overlay =====
  let overlayActive=false;
  function ensureOverlayStyles(){
    if (document.getElementById("stOverlayStyles")) return;
    const css = document.createElement("style");
    css.id = "stOverlayStyles";
    css.textContent = `
      .st-overlay-active { overflow: hidden; }
      .st-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.94); display:flex; flex-direction:column; }
      .st-overlay .overlay-bar { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,.08); }
      .st-overlay .overlay-bar .title { font-size:15px; font-weight:600; opacity:.9; color:#fff; }
      .st-overlay .overlay-bar .close { font-size:13px; padding:6px 10px; border-radius:10px; border:1px solid rgba(255,255,255,.15); background:transparent; color:#fff; }
      .st-overlay .overlay-body { flex:1; overflow:auto; padding:12px; }
      .st-overlay .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:12px; }
      .st-overlay .cell { background:#111; border-radius:12px; overflow:hidden; }
      .st-overlay img.person { width:100%; height:220px; object-fit:cover; display:block; }
      .st-overlay .label { text-align:center; font-size:12px; opacity:.9; padding:6px 8px; background:rgba(255,255,255,.06); color:#fff; }
    `;
    document.head.appendChild(css);
  }
  function openOverlay(){
    overlayActive = true;
    ensureOverlayStyles();
    const overlay = document.createElement("div");
    overlay.className = "st-overlay";
    overlay.id = "stOverlay";

    const bar = document.createElement("div");
    bar.className = "overlay-bar";
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = "Siblings";
    const close = document.createElement("button");
    close.className = "close";
    close.textContent = "Close";
    close.addEventListener("click", closeOverlay);
    bar.appendChild(title); bar.appendChild(close);

    const body = document.createElement("div");
    body.className = "overlay-body";
    const grid = document.createElement("div");
    grid.className = "grid";
    grid.id = "stOverlayGrid";
    body.appendChild(grid);

    overlay.appendChild(bar); overlay.appendChild(body);

    // swipe-down-to-close
    let t=false,sx=0,sy=0,dx=0,dy=0;
    overlay.addEventListener("pointerdown",(e)=>{ t=true; sx=e.clientX; sy=e.clientY; dx=dy=0; });
    overlay.addEventListener("pointermove",(e)=>{ if(!t) return; dx=e.clientX-sx; dy=e.clientY-sy; });
    overlay.addEventListener("pointerup",()=>{ if(t){ t=false; if(Math.abs(dy)>80 && Math.abs(dy)>Math.abs(dx) && dy>0) closeOverlay(); } });
    overlay.addEventListener("pointercancel",()=>{ t=false; });

    document.body.classList.add("st-overlay-active");
    document.body.appendChild(overlay);
    return grid;
  }
  function closeOverlay(){
    overlayActive = false;
    document.body.classList.remove("st-overlay-active");
    const ov = document.getElementById("stOverlay");
    if (ov) ov.remove();
  }
  async function showSiblingsOverlay(id){
    const grid = openOverlay();
    grid.innerHTML="";
    const sibs = siblingsOf(id);
    for (const s of sibs) grid.appendChild(await imgCell(s,{label:`${s} (Sibling)`}));
  }

  // ===== Anchor / History =====
  async function setAnchor(id){
    anchorId = Number(id);
    await renderAnchor(anchorId);
    hideParentsLane();
    hideChildrenLane();
    spouseViewOf = null;
  }
  function pushHistory(id){ if(id!=null) historyStack.push(id); }
  function goBack(){
    if (overlayActive){ closeOverlay(); return; }
    if (!historyStack.length) return;
    const prev = historyStack.pop();
    spouseViewOf = null;
    setAnchor(prev);
  }

  // ===== Spouse toggle =====
  async function tryShowSpouse(){
    if (spouseViewOf!=null){
      const o = spouseViewOf;
      spouseViewOf = null;
      pushHistory(anchorId);
      setAnchor(o);
      return;
    }
    try{
      await loadPersonImageUrl(anchorId, true);
      anchorArea.innerHTML = "";
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.id = `${anchorId}.1`;
      const img = document.createElement("img");
      img.className = "person anchor-fit"; // fit spouse solo as well
      img.alt = `${anchorId}.1 (spouse)`;
      img.src = `${IMAGE_BASE}${anchorId}.1.jpg`;
      cell.appendChild(img);
      const cap = document.createElement("div");
      cap.className = "label";
      cap.textContent = `${anchorId}.1`;
      cell.appendChild(cap);
      anchorArea.appendChild(cell);
      spouseViewOf = anchorId;
    }catch(err){ console.warn(err.message); }
  }

  // ===== Gestures =====
  let tracking=false,startX=0,startY=0,dx=0,dy=0;
  const SWIPE_THRESHOLD=50;
  function onPointerDown(e){ tracking=true; startX=e.clientX; startY=e.clientY; dx=dy=0; }
  function onPointerMove(e){ if(!tracking) return; dx=e.clientX-startX; dy=e.clientY-startY; }
  function onPointerUp(){
    if(!tracking) return;
    tracking=false;
    const ax=Math.abs(dx), ay=Math.abs(dy);
    if(ax<SWIPE_THRESHOLD && ay<SWIPE_THRESHOLD) return;
    if(ax>ay){
      if(dx>0) tryShowSpouse();
      else showSiblingsOverlay(anchorId);
    }else{
      if(dy<0) renderParents(anchorId);
      else renderChildren(anchorId);
    }
  }

  document.addEventListener("touchmove",(e)=>{ if(!overlayActive) e.preventDefault(); },{passive:false});
  document.addEventListener("gesturestart",(e)=>e.preventDefault());
  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", ()=>{ tracking=false; });
  backBtn.addEventListener("click", goBack);

  // start prompt
  startBtn?.addEventListener("click",()=>{ promptModal.classList.remove("hidden"); startInput.value=""; startInput.focus(); });
  cancelStart?.addEventListener("click",()=>promptModal.classList.add("hidden"));
  confirmStart?.addEventListener("click",()=>{
    const v = startInput.value.trim();
    if (!/^\d+(\.1)?$/.test(v)){ startInput.focus(); return; }
    promptModal.classList.add("hidden");
    pushHistory(anchorId);
    spouseViewOf = null;
    setAnchor(Number(v.replace(".1","")));
  });
  startInput?.addEventListener("keydown",(e)=>{ if(e.key==="Enter") confirmStart.click(); if(e.key==="Escape") cancelStart.click(); });

  // boot
  window.addEventListener("load",()=>{
    const startParam = getQueryParam("start");
    const startId = (startParam && /^\d+(\.1)?$/.test(startParam))
      ? Number(String(startParam).replace(".1",""))
      : 100000;
    setAnchor(startId);
  });
})();