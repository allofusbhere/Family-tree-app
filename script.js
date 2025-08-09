// SwipeTree — Buttons Only (Full Logic, jsDelivr)
const CDN_BASE = "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";
const EXT_CANDIDATES = [".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG"];

// --- DOM
const anchorImg = document.getElementById("anchorImg");
const anchorCaption = document.getElementById("anchorCaption");
const grid = document.getElementById("grid");
const debugOut = document.getElementById("debugOut");

const btnParents  = document.getElementById("btnParents");
const btnSiblings = document.getElementById("btnSiblings");
const btnSpouse   = document.getElementById("btnSpouse");
const btnChildren = document.getElementById("btnChildren");
const btnBack     = document.getElementById("btnBack");

// --- State
let historyStack = [];
let anchorId = null;

// --- Utils
function dlog(...args) { debugOut.textContent += args.join(" ") + "\n"; }
function buildCandidates(id) { return EXT_CANDIDATES.map(ext => CDN_BASE + id + ext); }

function setImageFromCandidates(imgEl, id, onDone) {
  const urls = buildCandidates(id);
  let idx = 0;
  function tryNext() {
    if (idx >= urls.length) {
      dlog("FAILED all candidates for", id);
      imgEl.removeAttribute("src");
      onDone?.(false, null);
      return;
    }
    const url = urls[idx++];
    dlog("Trying", url);
    imgEl.onload = () => { dlog("Loaded", url); onDone?.(true, url); };
    imgEl.onerror = () => { dlog("Error", url); tryNext(); };
    imgEl.src = url;
  }
  tryNext();
}

function numericPart(id) {
  // Keep only the base numeric before any ".1" (spouse) or further suffixes
  const str = String(id);
  const m = str.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : NaN;
}

function factorOfRightmostNonZero(n) {
  // returns 1,10,100,... for the rightmost non-zero digit
  let f = 1;
  while (Math.floor(n / f) % 10 === 0) {
    f *= 10;
    if (f > 1e12) break;
  }
  return f;
}

function parentIdOf(n) {
  const f = factorOfRightmostNonZero(n);
  const digit = Math.floor(n / f) % 10;
  if (digit === 0) return n; // fallback
  return n - digit * f;
}

function isTopOfBranch(n) {
  // If only the first (leftmost) digit is non-zero (e.g., 100000), treat as not a parent.
  // For simplicity, consider numbers like 100000, 200000, ... where n % 100000 === 0 and n < 1000000.
  return (n % 100000 === 0) && (n < 1000000);
}

function siblingsOf(n) {
  const f = factorOfRightmostNonZero(n);
  const p = parentIdOf(n);
  const list = [];
  for (let d = 1; d <= 9; d++) {
    const s = p + d * f;
    if (s !== n) list.push(s);
  }
  return list;
}

function childrenOf(n) {
  const f = factorOfRightmostNonZero(n);
  const next = Math.floor(f / 10);
  if (next <= 0) return [];
  if (isTopOfBranch(n)) return []; // do not generate children for 100000, 200000, etc.
  const list = [];
  for (let d = 1; d <= 9; d++) {
    list.push(n + d * next);
  }
  return list;
}

// --- UI
function updateAnchor(id) {
  anchorId = id;
  anchorCaption.textContent = `${id}`;
  setImageFromCandidates(anchorImg, id, (ok) => {
    if (!ok) anchorCaption.textContent = `${id} (image not found)`;
  });
}

function makeCard(id) {
  const card = document.createElement("div");
  card.className = "grid-card";
  const wrap = document.createElement("div");
  wrap.className = "img-wrap";
  const img = document.createElement("img");
  wrap.appendChild(img);
  const cap = document.createElement("div");
  cap.className = "caption";
  cap.textContent = id;
  card.appendChild(wrap);
  card.appendChild(cap);
  setImageFromCandidates(img, id, (ok) => {
    if (!ok) cap.textContent = `${id} (image not found)`;
  });
  card.onclick = () => { historyStack.push(anchorId); updateAnchor(String(id)); };
  return card;
}

function showIds(ids) {
  grid.innerHTML = "";
  ids.forEach(id => grid.appendChild(makeCard(id)));
}

// --- Button handlers
btnParents.onclick = () => {
  const n = numericPart(anchorId);
  const p = parentIdOf(n);
  const ids = (p === n) ? [] : [p];
  showIds(ids);
};

btnSiblings.onclick = () => {
  const n = numericPart(anchorId);
  const ids = siblingsOf(n);
  showIds(ids);
};

btnChildren.onclick = () => {
  const n = numericPart(anchorId);
  const ids = childrenOf(n);
  showIds(ids);
};

btnSpouse.onclick = () => {
  // Show just the direct partner file: anchorId.1
  showIds([`${anchorId}.1`]);
};

btnBack.onclick = () => { if (historyStack.length) updateAnchor(historyStack.pop()); };

// --- Launch
(function launch() {
  let start = (typeof sessionStorage !== "undefined") ? sessionStorage.getItem("swipetree_start_id") : null;
  if (!start) {
    start = prompt("Enter starting ID (e.g., 140000):", "140000") || "140000";
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem("swipetree_start_id", start);
  }
  updateAnchor(start);
})();