/* SwipeTree – stable baseline (v132b)
   - Numeric relationship logic derived from filename ID only (no hardcoding)
   - Swipe gestures: Right=Spouse, Up=Parents, Left=Siblings, Down=Children
   - Back button uses history stack; closes grid first, then navigates back
   - Images loaded from GitHub Pages images repo (configurable)
*/

const CONFIG = {
  // Update if you keep images elsewhere; trailing slash required.
  IMG_BASE: "https://allofusbhere.github.io/family-tree-images/",
  IMG_EXT: ".jpg",
  PLACEHOLDER: "placeholder.png",
  SWIPE_THRESHOLD: 45, // px
};

const els = {
  startId: document.getElementById("startId"),
  startBtn: document.getElementById("startBtn"),
  backBtn: document.getElementById("backBtn"),
  anchorImg: document.getElementById("anchorImg"),
  anchorLabel: document.getElementById("anchorLabel"),
  anchorWrap: document.getElementById("anchorWrap"),
  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  grid: document.getElementById("grid"),
  closeOverlay: document.getElementById("closeOverlay"),
};

let anchorId = null;           // string, may contain ".1"
let historyStack = [];         // array of ids (strings)
let touchStart = null;
let overlayOpen = false;

function imgUrlFor(id) {
  return CONFIG.IMG_BASE + id + CONFIG.IMG_EXT;
}
function setImg(el, id) {
  const url = imgUrlFor(id);
  el.src = url;
  el.onerror = () => { el.src = CONFIG.PLACEHOLDER; };
}

function isSpouse(id) { return String(id).includes(".1"); }
function baseIdOf(id) { return String(id).split(".")[0]; }
function spouseOf(id) {
  const base = baseIdOf(id);
  // If current is spouse (xxx.1), anchor should be its partner base (no .1)
  // Otherwise spouse is base + ".1"
  return isSpouse(id) ? base : `${base}.1`;
}

function countTrailingZeros(numStr) {
  let i = numStr.length - 1;
  let count = 0;
  while (i >= 0 && numStr[i] === "0") {
    count++; i--;
  }
  return count;
}

function digitAtPlace(numStr, placeValue) {
  // placeValue = 10^k, return digit at that place (0..9)
  const len = numStr.length;
  const k = Math.log10(placeValue);
  const idxFromRight = k; // 0 => ones, 1 => tens ...
  const i = len - 1 - idxFromRight;
  if (i < 0) return 0;
  return parseInt(numStr[i], 10);
}

function setDigitAtPlace(numStr, placeValue, digit) {
  const len = numStr.length;
  const k = Math.log10(placeValue);
  const idxFromRight = k;
  const i = len - 1 - idxFromRight;
  if (i < 0) return numStr;
  const arr = numStr.split("");
  arr[i] = String(digit);
  return arr.join("");
}

function normalizeId(id) {
  // Ensure it's a 6+ digit string (no commas), preserve existing length
  const s = String(id).split(".")[0];
  return s;
}

function getParent(baseStr) {
  // Parent: zero out the CURRENT varying digit (rightmost non-zero)
  // Example: 140000 -> current varying is '4' at 10^4 => parent 100000
  //          141000 -> varying '1' at 10^3 => parent 140000
  const len = baseStr.length;
  // Find index of rightmost non-zero digit
  let i = len - 1;
  while (i >= 0 && baseStr[i] === "0") i--;
  if (i < 0) return null; // all zeros? invalid
  const place = len - 1 - i; // 0 => ones, 1=>tens ...
  const placeValue = Math.pow(10, place);
  // If this is the leftmost digit (i==0), parent would be leading 0s -> stop
  if (i === 0) return null;
  // Set that digit to 0
  let parentStr = setDigitAtPlace(baseStr, placeValue, 0);
  // Also zero all lower places (to the right) if any non-zero exist
  for (let p = place - 1; p >= 0; p--) {
    parentStr = setDigitAtPlace(parentStr, Math.pow(10, p), 0);
  }
  return parentStr;
}

function getChildren(baseStr) {
  // Children: advance the NEXT lower digit (one place to the RIGHT of current varying digit)
  // Example: 140000 -> children vary 10^3: 141000..149000
  //          141000 -> children vary 10^2: 141100..141900
  const len = baseStr.length;
  // Locate current varying digit (rightmost non-zero)
  let i = len - 1;
  while (i >= 0 && baseStr[i] === "0") i--;
  if (i < 0) return [];
  const currentPlace = len - 1 - i;
  const childPlace = currentPlace - 1; // one to the right
  if (childPlace < 0) return []; // cannot go deeper
  const placeValue = Math.pow(10, childPlace);
  const children = [];
  for (let d = 1; d <= 9; d++) {
    let s = setDigitAtPlace(baseStr, placeValue, d);
    // Zero out any lower places (to the right of childPlace)
    for (let p = childPlace - 1; p >= 0; p--) s = setDigitAtPlace(s, Math.pow(10, p), 0);
    children.push(s);
  }
  return children;
}

function getSiblings(baseStr) {
  // Siblings: vary the CURRENT varying digit 1..9 (same last N zeros)
  // Example: 140000 -> siblings 110000..190000 (excluding 140000)
  const len = baseStr.length;
  let i = len - 1;
  while (i >= 0 && baseStr[i] === "0") i--;
  if (i < 0) return [];
  const place = len - 1 - i;
  const placeValue = Math.pow(10, place);
  const currentDigit = parseInt(baseStr[i], 10);
  const sibs = [];
  for (let d = 1; d <= 9; d++) {
    if (d === currentDigit) continue;
    let s = setDigitAtPlace(baseStr, placeValue, d);
    // zero out digits to the right of this place
    for (let p = place - 1; p >= 0; p--) s = setDigitAtPlace(s, Math.pow(10, p), 0);
    sibs.push(s);
  }
  return sibs;
}

function idTitle(id) {
  return String(id);
}

function renderAnchor(id) {
  anchorId = id;
  const base = baseIdOf(id);
  setImg(els.anchorImg, id);
  els.anchorLabel.textContent = idTitle(id);
  els.backBtn.disabled = historyStack.length === 0;
  // Update URL hash
  try {
    const hash = `#id=${encodeURIComponent(id)}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  } catch {}
}

function openOverlay(title, ids) {
  overlayOpen = true;
  els.overlayTitle.textContent = title;
  els.grid.innerHTML = "";
  ids.forEach((id) => {
    const card = document.createElement("div");
    card.className = "card";
    const img = document.createElement("img");
    setImg(img, id);
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = id.includes(".1") ? "Spouse" : (title.includes("Parent") ? "Parent" : (title.includes("Sibling") ? "Sibling" : "Child"));
    const titleEl = document.createElement("div");
    titleEl.className = "title";
    titleEl.textContent = id;
    card.appendChild(img);
    card.appendChild(titleEl);
    card.appendChild(meta);
    card.addEventListener("click", () => {
      // navigate to the selected id (strip spouse .1 for anchor unless user tapped spouse explicitly)
      historyStack.push(anchorId);
      closeOverlay();
      renderAnchor(id);
    });
    els.grid.appendChild(card);
  });
  els.overlay.classList.remove("hidden");
}

function closeOverlay() {
  overlayOpen = false;
  els.overlay.classList.add("hidden");
  els.grid.innerHTML = "";
}

function showParents() {
  const base = baseIdOf(anchorId);
  const parent = getParent(base);
  const ids = [];
  if (parent) ids.push(parent);
  openOverlay("Parents", ids);
}
function showChildren() {
  const base = baseIdOf(anchorId);
  const kids = getChildren(base);
  openOverlay("Children", kids);
}
function showSiblings() {
  const base = baseIdOf(anchorId);
  const sibs = getSiblings(base);
  openOverlay("Siblings", sibs);
}
function showSpouse() {
  const sid = spouseOf(anchorId);
  openOverlay("Spouse", [sid]);
}

function startWith(idInput) {
  const id = String(idInput).trim();
  if (!/^\d+(\.1)?$/.test(id)) return;
  historyStack.length = 0;
  renderAnchor(id);
}

function onBack() {
  if (overlayOpen) { closeOverlay(); return; }
  if (historyStack.length) {
    const prev = historyStack.pop();
    renderAnchor(prev);
  }
}

function parseHash() {
  const m = location.hash.match(/id=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// Touch swipe detection
function setupSwipes() {
  els.anchorWrap.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  els.anchorWrap.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    touchStart = null;

    if (ax < CONFIG.SWIPE_THRESHOLD && ay < CONFIG.SWIPE_THRESHOLD) return;

    if (ax > ay) {
      if (dx > 0) showSpouse();     // right
      else showSiblings();          // left
    } else {
      if (dy < 0) showParents();    // up
      else showChildren();          // down
    }
  }, { passive: true });
}

function boot() {
  // Wire controls
  els.startBtn.addEventListener("click", () => startWith(els.startId.value));
  els.backBtn.addEventListener("click", onBack);
  els.closeOverlay.addEventListener("click", closeOverlay);

  // Hash start
  const hid = parseHash();
  if (hid) {
    els.startId.value = hid;
    startWith(hid);
  } else {
    // Default anchor but no auto navigation; just show empty until Start
    els.anchorImg.src = CONFIG.PLACEHOLDER;
    els.anchorLabel.textContent = "Enter an ID and press Start";
  }

  setupSwipes();
}

document.addEventListener("DOMContentLoaded", boot);
