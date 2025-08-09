const CDN_BASE = "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";
const EXT_CANDIDATES = [".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG"];

const bodyEl = document.body;
const stage = document.getElementById("anchorStage");
const ripples = document.getElementById("ripples");
const slideA = document.getElementById("slideA");
const slideB = document.getElementById("slideB");
const anchorBadge = document.getElementById("anchorBadge");
const tray = document.getElementById("tray");
const trayGrid = document.getElementById("trayGrid");
const trayTitle = document.getElementById("trayTitle");
const trayClose = document.getElementById("trayClose");
const jumpInput = document.getElementById("jumpInput");
const jumpBtn = document.getElementById("jumpBtn");
const debugOut = document.getElementById("debugOut");

// Modal
const modal = document.getElementById("jumpModal");
const modalInput = document.getElementById("modalInput");
const modalGo = document.getElementById("modalGo");
const modalCancel = document.getElementById("modalCancel");
const modalError = document.getElementById("modalError");

let anchorId = null;
let historyStack = [];
let activeIsA = true;
let lastTapTime = 0;
let longPressTimer = null;

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

function getActive(){ return activeIsA ? slideA : slideB; }
function getInactive(){ return activeIsA ? slideB : slideA; }

function updateBadge(id, missing=false){
  anchorBadge.textContent = missing ? `${id} (image not found)` : `${id}`;
}

function forceReflow(el){ void el.offsetWidth; }

function setAnchorImmediate(id){
  anchorId = id;
  updateBadge(id);
  const img = getActive();
  const other = getInactive();
  other.className = "slide offscreen-right";
  setImageFromCandidates(img, id, ok=> updateBadge(id, !ok));
}

function animateTo(id, direction){
  const current = getActive();
  const incoming = getInactive();

  incoming.className = "slide " + (direction==='left' ? 'offscreen-right' :
                                   direction==='right' ? 'offscreen-left' :
                                   direction==='up' ? 'offscreen-down' : 'offscreen-up');
  forceReflow(incoming);

  setImageFromCandidates(incoming, id, ok=>{
    current.className = "slide"; forceReflow(current);
    requestAnimationFrame(()=>{
      current.className = "slide " + (direction==='left' ? 'offscreen-left' :
                                      direction==='right' ? 'offscreen-right' :
                                      direction==='up' ? 'offscreen-up' : 'offscreen-down');
      incoming.className = "slide";
      setTimeout(()=>{ activeIsA = !activeIsA; anchorId = id; updateBadge(id, !ok); }, 380);
    });
  });
}

/* ===== Tap Ripple Acknowledgment ===== */
function spawnRipple(x, y){
  const r = document.createElement('div');
  r.className = 'ripple';
  const rect = stage.getBoundingClientRect();
  r.style.left = (x - rect.left) + 'px';
  r.style.top  = (y - rect.top) + 'px';
  ripples.appendChild(r);
  setTimeout(()=> r.remove(), 500);
}

/* ===== Modal (Quick Jump) ===== */
function openModal(prefill=""){
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
  modalInput.value = prefill;
  modalError.textContent = "";
  setTimeout(()=> modalInput.focus(), 30);
}
function closeModal(){
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
}
function submitModal(){
  const raw = modalInput.value.trim();
  if(!/^(\d+)(?:\.1(?:\.(\d+))?)?$/.test(raw)){
    modalError.textContent = "Invalid ID format.";
    return;
  }
  historyStack.push(anchorId);
  animateTo(raw, 'right');
  if(typeof sessionStorage!=="undefined") sessionStorage.setItem("swipetree_start_id", raw);
  closeModal();
}
modalGo.addEventListener("click", submitModal);
modalCancel.addEventListener("click", closeModal);
modal.addEventListener("click", (e)=>{ if(e.target === modal) closeModal(); });
modalInput.addEventListener("keydown", (e)=>{
  if(e.key === "Enter") submitModal();
  if(e.key === "Escape") closeModal();
});

/* ===== Gestures with overrides ===== */
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
  // Long‑press for immersive
  clearTimeout(longPressTimer);
  longPressTimer = setTimeout(()=>{ bodyEl.classList.toggle('immersive'); }, 520);
  // Immediate visual acknowledgment for the tap location
  spawnRipple(e.clientX, e.clientY);
});
stage.addEventListener("pointerup", async e=>{
  cancelNative(e);
  clearTimeout(longPressTimer);

  // Double‑tap opens Quick Jump modal
  const now = performance.now();
  if(now - lastTapTime < 350){ openModal(anchorId); lastTapTime = 0; return; }
  lastTapTime = now;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  const dt = e.timeStamp - startT;
  if(dt > SWIPE_TIME) return;

  if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_DIST){
    if(dx < 0){
      stage.classList.add('nudge-left'); forceReflow(stage);
      const base = parseIdParts(anchorId).base ?? parseInt(anchorId,10);
      const sibs = await (async()=>{
        const out=[];
        for(const id of siblingsOf(base)){
          const test = new Image();
          const urls = buildCandidates(id);
          let i=0, found=false;
          while(i<urls.length && !found){
            await new Promise(res=>{ test.onload=()=>{found=True;res();}; test.onerror=()=>res(); test.src=urls[i++]; });
          }
          if(found) out.push(id);
        }
        return out;
      })();
      fillTray(sibs, 'left');
      openTray("Siblings");
      setTimeout(()=> stage.classList.remove('nudge-left'), 240);
    } else {
      const parts = parseIdParts(anchorId);
      historyStack.push(anchorId);
      if(parts.isSpouse){
        animateTo(String(parts.base), 'right');
      } else {
        animateTo(`${parts.base}.1`, 'right');
      }
    }
  } else if(Math.abs(dy) > SWIPE_DIST){
    if(dy < 0){
      const base = parseIdParts(anchorId);
      let target = base.base;
      if(base.isSpouse && base.spouseOwn) target = base.spouseOwn;
      const p = parentIdOf(target);
      if(p !== target){ historyStack.push(anchorId); animateTo(String(p), 'up'); }
    } else {
      stage.classList.add('nudge-down'); forceReflow(stage);
      const familyBase = parseIdParts(anchorId).base ?? parseInt(anchorId,10);
      const kids = await (async()=>{
        const out=[];
        for(const id of childrenOf(familyBase)){
          const test = new Image();
          const urls = buildCandidates(id);
          let i=0, found=false;
          while(i<urls.length && !found){
            await new Promise(res=>{ test.onload=()=>{found=True;res();}; test.onerror=()=>res(); test.src=urls[i++]; });
          }
          if(found) out.push(id);
        }
        return out;
      })();
      fillTray(kids, 'down');
      openTray("Children");
      setTimeout(()=> stage.classList.remove('nudge-down'), 240);
    }
  }
});

trayClose.addEventListener("click", closeTray);

// Header jump still works
function doJump(){
  const raw = (jumpInput.value||"").trim();
  if(!/^(\d+)(?:\.1(?:\.(\d+))?)?$/.test(raw)) return;
  historyStack.push(anchorId);
  animateTo(raw, 'right');
  if(typeof sessionStorage!=="undefined") sessionStorage.setItem("swipetree_start_id", raw);
}
jumpBtn.addEventListener("click", doJump);
jumpInput.addEventListener("keydown", e=>{ if(e.key==="Enter") doJump(); });

(function launch(){
  let start = (typeof sessionStorage!=="undefined") ? sessionStorage.getItem("swipetree_start_id") : null;
  if(!start){ start = "140000"; if(typeof sessionStorage!=="undefined") sessionStorage.setItem("swipetree_start_id", start); }
  setAnchorImmediate(start);
})();