// SwipeTree — Buttons Only (Single Display + Local Index v9)
// Spouse & ParentB: always show .1 image; extended (clickable) shown first if present.

(function(){
  const exts = [".jpg",".jpeg",".png",".JPG",".JPEG",".PNG"];
  const lowerExts = [".jpg",".jpeg",".png"];
  const state = { anchorId: null, history: [] };
  const fileIndex = { byName: new Map(), names: new Set() };

  const $ = id => document.getElementById(id);
  const setHistUI = () => {
    $("histStat").textContent = state.history.length ? `History: ${state.history.length}` : "";
    $("btnBack").disabled = state.history.length === 0;
  };
  const setFileCount = () => {
    $("fileCount").textContent = fileIndex.names.size ? `${fileIndex.names.size} files indexed` : "No files indexed (optional)";
  };

  // ---------- File index ----------
  function addFile(file){
    const lc = file.name.toLowerCase();
    if(!lowerExts.some(e=>lc.endsWith(e))) return;
    fileIndex.byName.set(lc, file);
    fileIndex.names.add(lc);
  }
  function addFiles(list){ for(const f of list) addFile(f); setFileCount(); }
  $("filePicker").addEventListener("change", e => addFiles(e.target.files));

  // ---------- Utilities ----------
  function trailingZeroPlace(idNum){ let p=1; while(idNum % (p*10)===0) p*=10; return p; }
  function computeParentA(childIdStr){
    const child = Number(childIdStr); if(!Number.isFinite(child)) return null;
    const place = trailingZeroPlace(child);
    const birth = Math.floor(child/place)%10;
    if(birth===0) return null;
    return String(child - birth*place);
  }
  function childStepFor(parentIdStr){
    const p = Number(parentIdStr); if(!Number.isFinite(p)) return null;
    const place = trailingZeroPlace(p);
    const step = Math.floor(place/10);
    return step>=1?step:null;
  }

  function fileUrlForStem(stem){
    for(const ext of lowerExts){
      const name = (stem + ext).toLowerCase();
      const f = fileIndex.byName.get(name);
      if(f){ return URL.createObjectURL(f); }
    }
    return null;
  }

  function makeImgElementForStem(stem){
    const url = fileUrlForStem(stem);
    const img = new Image();
    if(url){ img.src = url; img.alt = stem; return img; }
    let i=0;
    function tryNext(){
      if(i>=exts.length){ img.dataset.failed="1"; return; }
      img.src = stem + exts[i++];
    }
    img.onload = ()=> img.dataset.loaded="1";
    img.onerror = tryNext;
    tryNext();
    img.alt = stem;
    return img;
  }

  function clearDisplay(msg){
    $("displayTitle").textContent = "—";
    $("displayStatus").textContent = msg || "—";
    const grid = $("displayGrid");
    grid.className = "grid";
    grid.innerHTML = "";
  }
  function selectAnchor(id, push=true){
    if(push && state.anchorId){
      if(state.history[state.history.length-1] !== state.anchorId){
        state.history.push(state.anchorId);
      }
    }
    state.anchorId = id;
    const imgOld = $("anchorImg");
    const img = makeImgElementForStem(id);
    img.id="anchorImg";
    imgOld.replaceWith(img);
    $("anchorIdCap").textContent=id;
    clearDisplay("Anchor changed");
    setHistUI();
  }

  // ---------- Relationship builders ----------
  function buildSiblings8(id){
    const parent = computeParentA(id); if(!parent) return [];
    const place = trailingZeroPlace(Number(id));
    const birth = Math.floor(Number(id)/place)%10;
    const ids=[];
    for(let i=1;i<=9;i++){
      if(i===birth) continue;
      ids.push(String(Number(parent)+i*place));
      if(ids.length===8) break;
    }
    return ids.map(x=>({stem:x,label:"Sibling", target:x}));
  }
  function buildChildren9(parentId){
    const step = childStepFor(parentId); if(!step) return [];
    const base = Number(parentId);
    const ids=[]; for(let i=1;i<=9;i++) ids.push(String(base + i*step));
    return ids.map(x=>({stem:x,label:"Child", target:x}));
  }

  function spouseFromIndex(anchorId){
    const extended=[]; let direct=null;
    const prefix = `${anchorId}.1`;
    for(const name of fileIndex.names){
      if(!(name.endsWith(".jpg")||name.endsWith(".jpeg")||name.endsWith(".png"))) continue;
      if(!name.startsWith(prefix.toLowerCase())) continue;
      const stem = name.replace(/\.(jpg|jpeg|png)$/i,"");
      const parts = stem.split(".");
      if(parts.length===2){ direct = {stem: stem, label:"Spouse (image-only)", target:null}; }
      else if(parts.length===3 && parts[1]==="1"){
        const partner = parts[2];
        extended.push({stem: stem, label:"Spouse", target: partner});
      }
    }
    // show extended first, then direct if present
    const out = [...extended];
    if(direct) out.unshift(direct); // keep direct first tile for familiarity
    // dedupe by stem
    const seen=new Set(); const list=[];
    for(const it of out){ if(seen.has(it.stem)) continue; seen.add(it.stem); list.push(it); }
    return list.slice(0,9);
  }

  function parentBFromIndex(parentAId){
    const extended=[]; let direct=null;
    const prefix = `${parentAId}.1`;
    for(const name of fileIndex.names){
      if(!(name.endsWith(".jpg")||name.endsWith(".jpeg")||name.endsWith(".png"))) continue;
      if(!name.startsWith(prefix.toLowerCase())) continue;
      const stem = name.replace(/\.(jpg|jpeg|png)$/i,"");
      const parts = stem.split(".");
      if(parts.length===2){ direct = {stem: stem, label:"Parent B (image-only)", target:null}; }
      else if(parts.length===3 && parts[1]==="1"){
        const partner = parts[2];
        extended.push({stem: stem, label:"Parent B", target: partner});
      }
    }
    if(extended.length) return [extended[0]];       // clickable if available
    if(direct) return [direct];                     // fallback to image-only
    return [];                                      // none
  }

  function spouseFallback(anchorId){
    return [{stem:`${anchorId}.1`, label:"Spouse (image-only)", target:null}];
  }
  function parents2(anchorId){
    const pA = computeParentA(anchorId);
    if(!pA) return [{stem:null,label:"Parent A (none)", target:null}];
    const out=[{stem:pA,label:"Parent A", target:pA}];
    const bExact = parentBFromIndex(pA);
    if(bExact.length){ out.push(bExact[0]); }
    else{ out.push({stem:`${pA}.1`, label:"Parent B (image-only)", target:null}); }
    return out.slice(0,2);
  }

  // ---------- Rendering ----------
  function makeTile(stem, label, target){
    const tile = document.createElement("div");
    tile.className="tile" + (target ? " clickable" : "");
    const wrap = document.createElement("div"); wrap.className="imgwrap";
    if(stem){
      const img = makeImgElementForStem(stem);
      wrap.appendChild(img);
    }else{ tile.classList.add("placeholder"); }
    const cap = document.createElement("div"); cap.className="cap";
    cap.textContent = stem ? (label? `${label}: ${stem}`: stem) : (label || "—");
    tile.appendChild(wrap); tile.appendChild(cap);
    if(target){ tile.addEventListener("click", ()=>{ selectAnchor(target,true); }); }
    return tile;
  }
  function renderFixedGrid(mode, items){
    const grid = $("displayGrid");
    grid.innerHTML = ""; grid.className = "grid";
    if(mode==="parents"){
      grid.classList.add("parents");
      $("displayTitle").textContent = "Parent(s)";
      const slots=2;
      for(let i=0;i<slots;i++){
        const it = items[i] || {stem:null,label: i===0? "Parent A (none)" : "Parent B (unknown)", target:null};
        grid.appendChild(makeTile(it.stem, it.label, it.target));
      }
      $("displayStatus").textContent = `${Math.min(items.length,2)} of 2`;
      return;
    }
    grid.classList.add("squares");
    const slots=9;
    let title = mode[0].toUpperCase()+mode.slice(1);
    $("displayTitle").textContent = title;
    for(let i=0;i<slots;i++){
      const it = items[i] || null;
      grid.appendChild(it ? makeTile(it.stem, it.label, it.target) : makeTile(null,"",null));
    }
    $("displayStatus").textContent = `${Math.min(items.length,slots)} of ${slots}`;
  }

  // ---------- Buttons ----------
  $("launchBtn").addEventListener("click", ()=>{
    const id = ($("startId").value||"").trim(); if(!id) return;
    state.history.length = 0;
    selectAnchor(id,false);
    clearDisplay("Ready");
  });
  $("btnBack").addEventListener("click", ()=>{
    if(!state.history.length) return;
    const prev = state.history.pop();
    selectAnchor(prev,false);
  });
  $("btnParent").addEventListener("click", ()=>{
    if(!state.anchorId) return;
    renderFixedGrid("parents", parents2(state.anchorId));
  });
  $("btnSiblings").addEventListener("click", ()=>{
    if(!state.anchorId) return;
    renderFixedGrid("siblings", buildSiblings8(state.anchorId));
  });
  $("btnChildren").addEventListener("click", ()=>{
    if(!state.anchorId) return;
    renderFixedGrid("children", buildChildren9(state.anchorId));
  });
  $("btnSpouse").addEventListener("click", ()=>{
    if(!state.anchorId) return;
    const items = fileIndex.names.size ? spouseFromIndex(state.anchorId) : spouseFallback(state.anchorId);
    renderFixedGrid("spouse", items);
  });
  setHistUI();
})();