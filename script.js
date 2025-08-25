(function () {
  const BASE_IMAGE_URL = "https://allofusbhere.github.io/family-tree-images/";
  const PLACEHOLDER_IMAGE = BASE_IMAGE_URL + "placeholder.jpg";
  const isGitHubPages = location.hostname.endsWith("github.io");
  const LABELS_ENDPOINT = isGitHubPages ? null : "/.netlify/functions/labels";

  let anchorId = "100000";
  let historyStack = [];
  let isOverlayOpen = false;
  let spouseMap = {};
  let labelsCache = {};

  const el = {
    anchorImg: document.getElementById("anchorImg"),
    anchorName: document.getElementById("anchorName"),
    anchorId: document.getElementById("anchorId"),
    anchorWrap: document.getElementById("anchorWrap"),
    overlay: document.getElementById("overlay"),
    overlayTitle: document.getElementById("overlayTitle"),
    grid: document.getElementById("grid"),
    closeOverlayBtn: document.getElementById("closeOverlayBtn"),
    backBtn: document.getElementById("backBtn"),
    idInput: document.getElementById("idInput"),
    startBtn: document.getElementById("startBtn"),
    stage: document.getElementById("stage"),
  };

  function hideOverlayHard() {
    el.overlay.classList.add("hidden");
    el.overlay.style.display = "none";
    isOverlayOpen = false;
  }
  function showOverlay() {
    el.overlay.style.display = "";
    el.overlay.classList.remove("hidden");
    isOverlayOpen = true;
  }

  function imgUrlFor(id) { return BASE_IMAGE_URL + id + ".jpg"; }
  function setAnchor(id, pushHistory = true) {
    if (!id || typeof id !== "string") return;
    if (pushHistory && anchorId && anchorId !== id) historyStack.push(anchorId);
    anchorId = String(id).trim();
    updateAnchorView();
    hideOverlayHard();
    updateHash();
  }
  function updateHash() {
    try {
      const v = new URLSearchParams(window.location.search).get("v") || "v";
      const url = `${location.origin}${location.pathname}?v=${encodeURIComponent(v)}#id=${anchorId}`;
      history.replaceState(null, "", url);
    } catch {}
  }
  function loadImage(imgEl, id) {
    return new Promise((resolve) => {
      const src = imgUrlFor(id);
      imgEl.onerror = () => { imgEl.src = PLACEHOLDER_IMAGE; resolve(false); };
      imgEl.onload = () => resolve(true);
      imgEl.src = src;
    });
  }

  async function fetchLabels() {
    try {
      if (LABELS_ENDPOINT) {
        const res = await fetch(LABELS_ENDPOINT, { method: "GET" });
        if (res.ok) labelsCache = await res.json();
      }
    } catch {}
    try {
      const local = localStorage.getItem("swipetree_labels");
      if (local) labelsCache = { ...labelsCache, ...(JSON.parse(local) || {}) };
    } catch {}
  }
  function getName(id) { return labelsCache[id] || ""; }
  function setName(id, name) {
    labelsCache[id] = name;
    try { localStorage.setItem("swipetree_labels", JSON.stringify(labelsCache)); } catch {}
  }

  async function fetchSpouseMap() {
    try {
      const res = await fetch("spouse_link.json", { cache: "no-store" });
      if (res.ok) {
        const map = await res.json();
        spouseMap = { ...map };
        Object.entries({ ...spouseMap }).forEach(([a,b]) => { spouseMap[a]=b; spouseMap[b]=a; });
      }
    } catch {}
  }

  function digits(id) {
    const base = String(id).split(".")[0];
    const s = base.padStart(6, "0").slice(-6);
    return s.split("").map((d) => parseInt(d, 10));
  }
  function toId(digs) { return digs.join(""); }
  function computeSiblings(id) {
    const d = digits(id);
    const pos = d.findIndex((x)=>x!==0);
    if (pos===-1) return [];
    const out=[];
    for(let v=1; v<=9; v++){
      if(v===d[pos]) continue;
      const dd=d.slice(); dd[pos]=v;
      for(let i=pos+1;i<6;i++) dd[i]=0;
      out.push(toId(dd));
    }
    return Array.from(new Set(out));
  }
  function computedParent(id) {
    const d = digits(id);
    if (d[1]===0 && d[2]===0 && d[3]===0 && d[4]===0 && d[5]===0) return null;
    const out=d.slice();
    if (d[1]!==0) out[1]=0;
    else if (d[2]!==0) out[2]=0;
    else if (d[3]!==0) out[3]=0;
    else if (d[4]!==0) out[4]=0;
    else if (d[5]!==0) out[5]=0;
    else return null;
    return toId(out);
  }
  function computeChildren(id) {
    const d = digits(id);
    const highest = d.findIndex((x)=>x!==0);
    const childPos = highest + 1;
    if (childPos>5) return [];
    const out=[];
    for(let v=1; v<=9; v++){
      const dd=d.slice(); dd[childPos]=v;
      for(let i=childPos+1;i<6;i++) dd[i]=0;
      out.push(toId(dd));
    }
    return Array.from(new Set(out));
  }

  async function updateAnchorView() {
    el.anchorId.textContent = anchorId;
    el.anchorName.textContent = getName(anchorId) || "\\u00A0";
    await loadImage(el.anchorImg, anchorId);
  }
  function openOverlay(title, tiles) {
    const safeTitle = title || "Info";
    const safeTiles = (tiles && tiles.length ? tiles : [{ id: "No data", placeholder: true, imgId: "placeholder" }]);
    el.overlayTitle.textContent = safeTitle;
    el.grid.innerHTML = "";
    safeTiles.forEach((t)=>{
      const div=document.createElement("div");
      div.className="tile"+(t.placeholder?" placeholder":"");
      div.dataset.id=t.id||"";
      const imgwrap=document.createElement("div"); imgwrap.className="imgwrap";
      const img=document.createElement("img"); img.loading="lazy";
      img.src = BASE_IMAGE_URL + (t.imgId || t.id) + ".jpg";
      img.onerror=()=>img.src=PLACEHOLDER_IMAGE;
      imgwrap.appendChild(img);
      const meta=document.createElement("div"); meta.className="meta";
      const name=document.createElement("div"); name.className="name"; name.textContent=t.name||"";
      const id=document.createElement("div"); id.className="id"; id.textContent=t.id||"";
      meta.appendChild(name); meta.appendChild(id);
      div.appendChild(imgwrap); div.appendChild(meta);
      if(!t.placeholder){ div.addEventListener("click",()=>setAnchor(t.navigateTo||t.id)); }
      el.grid.appendChild(div);
    });
    showOverlay();
  }

  let sx=0, sy=0; const TH=40;
  function onTouchStart(e){ const t=e.changedTouches&&e.changedTouches[0]; if(!t) return; sx=t.clientX; sy=t.clientY; }
  function onTouchEnd(e){ const t=e.changedTouches&&e.changedTouches[0]; if(!t) return;
    const dx=t.clientX-sx, dy=t.clientY-sy; if (Math.abs(dx)<TH && Math.abs(dy)<TH) return;
    if (Math.abs(dx)>Math.abs(dy)) { if (dx>0) handleSwipe("right"); else handleSwipe("left"); }
    else { if (dy<0) handleSwipe("up"); else handleSwipe("down"); }
  }

  async function handleSwipe(dir){
    if(dir==="right"){
      const tiles=await buildSpouseTiles(anchorId);
      openOverlay("Spouse", tiles);
    } else if(dir==="left"){
      const tiles=computeSiblings(anchorId).map(id=>({id, imgId:id, name:getName(id)}));
      openOverlay("Siblings", tiles);
    } else if(dir==="up"){
      const p1=computedParent(anchorId);
      const tiles=[]; if(p1) tiles.push({id:p1,imgId:p1,name:getName(p1)});
      tiles.push({id:"Parent2 (placeholder)", placeholder:true, imgId:"placeholder"});
      openOverlay("Parents", tiles);
    } else if(dir==="down"){
      const tiles=computeChildren(anchorId).map(id=>({id, imgId:id, name:getName(id)}));
      openOverlay("Children", tiles);
    }
  }
  async function buildSpouseTiles(id){
    const base=String(id).split(".")[0];
    const tiles=[];
    const partner=spouseMap[base];
    if(partner){ tiles.push({id:partner,imgId:partner+".1",name:getName(partner)||"Spouse",navigateTo:partner}); }
    else { tiles.push({id:base+".1",imgId:base+".1",name:"Spouse (.1)",navigateTo:base}); }
    return tiles;
  }

  // SoftEdit
  let timer=null;
  el.anchorWrap.addEventListener("touchstart", ()=>{ timer=setTimeout(()=>{
    const current=getName(anchorId)||""; const next=prompt("Edit name", current);
    if (typeof next==="string"){ setName(anchorId, next.trim()); updateAnchorView(); }
  },600); });
  el.anchorWrap.addEventListener("touchend", ()=>clearTimeout(timer));
  el.anchorWrap.addEventListener("touchmove", ()=>clearTimeout(timer));

  el.closeOverlayBtn.addEventListener("click", hideOverlayHard);
  el.backBtn.addEventListener("click", ()=>{ if(isOverlayOpen){ hideOverlayHard(); return; } const prev=historyStack.pop(); if(prev) setAnchor(prev, false); });
  el.startBtn.addEventListener("click", ()=>{ const v=String(el.idInput.value||"").trim(); if(/^\d{6}(?:\\.\d+)?$/.test(v)) setAnchor(v); });

  el.stage.addEventListener("touchstart", onTouchStart, {passive:true});
  el.stage.addEventListener("touchend", onTouchEnd, {passive:true});

  async function init(){
    hideOverlayHard();
    await Promise.all([fetchLabels(), fetchSpouseMap()]);
    const hash=new URLSearchParams(location.hash.slice(1));
    const idFromHash=hash.get("id"); if(idFromHash) anchorId=String(idFromHash).trim();
    updateAnchorView();
  }
  document.addEventListener("DOMContentLoaded", init);
})();