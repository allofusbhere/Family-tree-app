
(() => {
  const BUILD = window.SWIPE_TREE_BUILD || "";
  const qs = new URLSearchParams(location.search);
  const START = qs.get("start") || prompt("Enter starting ID", "140000") || "140000";
  const JUMP = qs.get("jump") || "";
  const CB = qs.get("cb") || BUILD;

  // POINT IMAGE BASE HERE (jsDelivr -> user repo of images)
  // You told me images live in a GitHub images repo. This is configurable:
  const IMAGE_BASE = "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";
  const EXT_ORDER = ["jpg","JPG","jpeg","JPEG","png","PNG"];

  // DOM
  const anchorImg = document.getElementById("anchorImg");
  const anchorLabel = document.getElementById("anchorLabel");
  const childrenArea = document.getElementById("childrenArea");
  const spouseArea = document.getElementById("spouseArea");
  const spouseImg = document.getElementById("spouseImg");
  const spouseCaption = document.getElementById("spouseCaption");
  const logEl = document.getElementById("log");

  function log(msg) {
    logEl.textContent = (msg + "\n" + logEl.textContent).slice(0, 8000);
  }

  function idToStr(x){ return String(x); }

  function urlFor(id, ext) {
    // Append cachebuster to ensure freshest file
    return `${IMAGE_BASE}${id}.${ext}?cb=${encodeURIComponent(CB)}`;
  }

  function tryLoad(id, exts=EXT_ORDER) {
    return new Promise((resolve) => {
      let idx = 0;
      const attempt = () => {
        if (idx >= exts.length) return resolve(null);
        const ext = exts[idx++];
        const img = new Image();
        img.onload = () => resolve({url: urlFor(id, ext), ext});
        img.onerror = attempt;
        img.src = urlFor(id, ext);
      };
      attempt();
    });
  }

  function show(el){ el.classList.remove("hidden"); }
  function hide(el){ el.classList.add("hidden"); }

  // === Relationship logic (dynamic, filename-only) ===
  // Children rule (confirmed): for a 6-digit like 140000, children are 141000..149000
  function childrenOf(baseIdStr) {
    const n = Number(baseIdStr);
    // children = base + k*1000, k=1..9 (but we only display those that exist)
    const step = 1000;
    const arr = [];
    for (let k=1; k<=9; k++) arr.push(String(n + k*step).padStart(baseIdStr.length,"0"));
    return arr;
  }

  // Spouse: look for "<id>.1"
  function spouseId(baseIdStr){ return `${baseIdStr}.1`; }

  async function loadAnchor(idStr){
    hide(childrenArea); hide(spouseArea);
    anchorImg.style.opacity = "0.001";
    anchorImg.style.display = "block";
    const found = await tryLoad(idStr);
    if (found){
      anchorImg.src = found.url;
      anchorLabel.textContent = `ID ${idStr}`;
      anchorImg.onload = () => { anchorImg.style.opacity = "1"; };
    } else {
      anchorImg.removeAttribute("src");
      anchorImg.style.display = "none";
      anchorLabel.textContent = `ID ${idStr} (image not found)`;
    }
    // optimistic prefetch spouse (non-blocking)
    prefetch(spouseId(idStr));
  }

  async function showSpouse(idStr){
    hide(childrenArea);
    const spId = spouseId(idStr);
    const found = await tryLoad(spId);
    if (found){
      show(spouseArea);
      spouseImg.style.display = "block";
      spouseImg.src = found.url;
      spouseCaption.textContent = `Spouse of ${idStr} (${spId})`;
    } else {
      show(spouseArea);
      spouseImg.style.display = "none";
      spouseCaption.textContent = `No spouse image for ${idStr}`;
    }
  }

  async function showChildrenGrid(idStr){
    hide(spouseArea);
    show(childrenArea);
    const ids = childrenOf(idStr);
    const cells = Array.from(childrenArea.querySelectorAll(".cell"));
    // ensure 9 cells exist
    for (let i=0;i<cells.length;i++){
      const cell = cells[i];
      const img = cell.querySelector("img");
      const cap = cell.querySelector(".caption");
      img.style.display = "none";
      img.removeAttribute("src");
      cap.textContent = "";
      cell.style.visibility = "hidden";
    }
    // load children in order; show only those that resolve
    let slot = 0;
    for (const cid of ids){
      const found = await tryLoad(cid);
      if (!found) { log(`child missing: ${cid}`); continue; }
      if (slot >= 9) break;
      const cell = cells[slot++];
      const img = cell.querySelector("img");
      const cap = cell.querySelector(".caption");
      img.src = found.url;
      img.dataset.childId = cid;
      img.style.display = "block";
      cap.textContent = cid;
      cell.style.visibility = "visible";
    }
    if (slot === 0){
      // nothing found -> still show grid but say "No children images"
      const cell = cells[0];
      cell.style.visibility = "visible";
      cell.querySelector(".caption").textContent = "No child images found";
    }
  }

  function prefetch(idStr){
    tryLoad(idStr).then(()=>{}).catch(()=>{});
  }

  // Tap on a child -> make it anchor
  childrenArea.addEventListener("click", (e) => {
    const img = e.target.closest("img");
    if (!img) return;
    const cid = img.dataset.childId;
    if (!cid) return;
    state.anchor = cid;
    history.pushState({anchor: cid}, "", `?start=${encodeURIComponent(cid)}&cb=${encodeURIComponent(CB)}`);
    loadAnchor(cid);
  });

  // === Swipe handling ===
  let startX=0, startY=0, tracking=false;
  const SWIPE_MIN = 40; // px

  function onTouchStart(e){
    const t = e.touches ? e.touches[0] : e;
    startX = t.clientX; startY = t.clientY; tracking = true;
  }
  function onTouchEnd(e){
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches ? e.changedTouches[0] : e;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax < SWIPE_MIN && ay < SWIPE_MIN) return; // ignore taps; children taps handled separately
    if (ax > ay){
      // horizontal
      if (dx > 0){
        // right -> spouse
        showSpouse(state.anchor);
        log(`Swipe RIGHT → spouse of ${state.anchor}`);
      } else {
        // left -> back to anchor only
        hide(spouseArea); hide(childrenArea);
        log(`Swipe LEFT → anchor only`);
      }
    } else {
      // vertical
      if (dy > 0){
        // down -> children
        showChildrenGrid(state.anchor);
        log(`Swipe DOWN → children of ${state.anchor}`);
      } else {
        // up -> (reserved for parent if/when needed)
        hide(spouseArea); hide(childrenArea);
        log(`Swipe UP → (reserved)`);
      }
    }
  }

  // Attach on the whole main area for reliability
  const main = document.querySelector("main");
  ["touchstart","mousedown"].forEach(ev => main.addEventListener(ev, onTouchStart, {passive:true}));
  ["touchend","mouseup","mouseleave"].forEach(ev => main.addEventListener(ev, onTouchEnd, {passive:true}));

  // Prevent native zoom/pinch from hijacking gestures
  document.addEventListener("gesturestart", e => e.preventDefault());
  document.addEventListener("gesturechange", e => e.preventDefault());
  document.addEventListener("gestureend", e => e.preventDefault());
  document.addEventListener("touchmove", function(e){
    // allow vertical page scroll if needed but reduce accidental interference
    if (e.scale && e.scale !== 1) e.preventDefault();
  }, {passive:false});

  const state = { anchor: idToStr(START) };

  // INIT
  loadAnchor(state.anchor).then(() => {
    if (JUMP === "children") showChildrenGrid(state.anchor);
    if (JUMP === "spouse") showSpouse(state.anchor);
  });

})(); 
