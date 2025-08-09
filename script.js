const CDN_BASE = "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";
const EXT_CANDIDATES = [".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG"];

const stage = document.getElementById("anchorStage");
const anchorImg = document.getElementById("anchorImg");
const anchorBadge = document.getElementById("anchorBadge");
const tray = document.getElementById("tray");
const trayGrid = document.getElementById("trayGrid");
const trayTitle = document.getElementById("trayTitle");
const trayClose = document.getElementById("trayClose");
const jumpInput = document.getElementById("jumpInput");
const jumpBtn = document.getElementById("jumpBtn");
const debugOut = document.getElementById("debugOut");

let anchorId = null;
let historyStack = [];

function dlog(...args){ debugOut.textContent += args.join(" ") + "\n"; }

function buildCandidates(id){ return EXT_CANDIDATES.map(ext => CDN_BASE + id + ext); }
function setImageFromCandidates(imgEl, id, onDone){
  const urls = buildCandidates(id);
  let i=0;
  function next(){
    if(i>=urls.length){ imgEl.removeAttribute("src"); onDone?.(false); return; }
    const url = urls[i++];
    imgEl.onload = ()=> onDone?.(true);
    imgEl.onerror = ()=> next();
    imgEl.src = url;
  }
  next();
}

function parseIdParts(id){
  const s = String(id).trim();
  const m = s.match(/^(\d+)(?:\.1(?:\.(\d+))?)?$/);
  if(!m) return { base:null, isSpouse:false, spouseOwn:null, raw:s, valid:false };
  return { base:parseInt(m[1],10), isSpouse:/\.1/.test(s), spouseOwn:m[2]?parseInt(m[2],10):null, raw:s, valid:true };
}

function factorOfRightmostNonZero(n){ let f=1; while(Math.floor(n/f)%10===0){ f*=10; if(f>1e12)break; } return f; }
function parentIdOf(n){ const f=factorOfRightmostNonZero(n); const digit=Math.floor(n/f)%10; if(digit===0) return n; return n - digit*f; }
function siblingsOf(n){ const f=factorOfRightmostNonZero(n); const p=parentIdOf(n); const list=[]; for(let d=1; d<=9; d++){ const s=p+d*f; if(s!==n) list.push(s); } return list; }
function childrenOf(n){ const f=factorOfRightmostNonZero(n); const next=Math.floor(f/10); if(next<=0)return[]; const list=[]; for(let d=1; d<=9; d++){ list.push(n + d*next); } return list; }

function updateAnchor(id){
  anchorId = id;
  anchorBadge.textContent = id;
  setImageFromCandidates(anchorImg, id, ok=>{
    if(!ok) anchorBadge.textContent = `${id} (image not found)`;
  });
}

function probeHasImage(id){
  return new Promise(resolve=>{
    const img = new Image();
    const urls = buildCandidates(id);
    let i=0;
    function next(){
      if(i>=urls.length) return resolve(false);
      img.onload = ()=> resolve(true);
      img.onerror = ()=> next();
      img.src = urls[i++];
    }
    next();
  });
}

async function filterExisting(ids){
  const out=[];
  for(const id of ids){
    if(await probeHasImage(id)) out.push(id);
  }
  return out;
}

function clearTray(){ trayGrid.innerHTML = ""; }
function openTray(title){ trayTitle.textContent = title; tray.classList.add("open"); }
function closeTray(){ tray.classList.remove("open"); }

function fillTray(ids){
  clearTray();
  if(ids.length){
    for(const id of ids){
      const card = document.createElement("div"); card.className="card";
      const box = document.createElement("div"); box.className="imgbox";
      const img = document.createElement("img"); box.appendChild(img);
      const cap = document.createElement("div"); cap.textContent = id;
      card.appendChild(box); card.appendChild(cap);
      trayGrid.appendChild(card);
      setImageFromCandidates(img, id, ()=>{});
      card.addEventListener("click", ()=>{ historyStack.push(anchorId); updateAnchor(String(id)); closeTray(); });
    }
  }
}

// Gestures with iPad overrides
let startX=0, startY=0, startT=0;
const SWIPE_DIST = 40;
const SWIPE_TIME = 600;

function cancelNative(e){ e.preventDefault(); e.stopPropagation(); }

stage.addEventListener("touchmove", cancelNative, { passive:false });
stage.addEventListener("gesturestart", cancelNative, { passive:false });
stage.addEventListener("gesturechange", cancelNative, { passive:false });
stage.addEventListener("gestureend", cancelNative, { passive:false });

stage.addEventListener("pointerdown", e=>{
  cancelNative(e);
  startX = e.clientX; startY = e.clientY; startT = e.timeStamp;
});
stage.addEventListener("pointerup", async e=>{
  cancelNative(e);
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  const dt = e.timeStamp - startT;
  if(dt > SWIPE_TIME) return;

  if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_DIST){
    if(dx < 0){
      const base = parseIdParts(anchorId).base ?? parseInt(anchorId,10);
      const sibs = await filterExisting(siblingsOf(base));
      fillTray(sibs);
      openTray("Siblings");
    } else {
      const parts = parseIdParts(anchorId);
      if(parts.isSpouse){
        updateAnchor(String(parts.base));
      } else {
        updateAnchor(`${parts.base}.1`);
      }
    }
  } else if(Math.abs(dy) > SWIPE_DIST){
    if(dy < 0){
      const base = parseIdParts(anchorId);
      let target = base.base;
      if(base.isSpouse && base.spouseOwn) target = base.spouseOwn;
      const p = parentIdOf(target);
      if(p !== target){ historyStack.push(anchorId); updateAnchor(String(p)); }
    } else {
      const familyBase = parseIdParts(anchorId).base ?? parseInt(anchorId,10);
      const kids = await filterExisting(childrenOf(familyBase));
      fillTray(kids);
      openTray("Children");
    }
  }
});

trayClose.addEventListener("click", closeTray);

function doJump(){
  const raw = (jumpInput.value||"").trim();
  if(!/^(\d+)(?:\.1(?:\.(\d+))?)?$/.test(raw)) return;
  historyStack.push(anchorId); updateAnchor(raw);
  if(typeof sessionStorage!=="undefined") sessionStorage.setItem("swipetree_start_id", raw);
}
jumpBtn.addEventListener("click", doJump);
jumpInput.addEventListener("keydown", e=>{ if(e.key==="Enter") doJump(); });

(function launch(){
  let start = (typeof sessionStorage!=="undefined") ? sessionStorage.getItem("swipetree_start_id") : null;
  if(!start){ start = "140000"; if(typeof sessionStorage!=="undefined") sessionStorage.setItem("swipetree_start_id", start); }
  updateAnchor(start);
})();