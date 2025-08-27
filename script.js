/* SwipeTree – v132b2
   Changes:
   1) Filter overlays to only show items whose images actually exist.
   2) Parents overlay shows up to two parents (base parent and its spouse .1), centered.
*/

const CONFIG = {
  IMG_BASE: "https://allofusbhere.github.io/family-tree-images/",
  IMG_EXT: ".jpg",
  PLACEHOLDER: "placeholder.png",
  SWIPE_THRESHOLD: 45,
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

let anchorId = null;
let historyStack = [];
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

function checkImgExists(id) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = imgUrlFor(id);
  });
}

function isSpouse(id) { return String(id).includes(".1"); }
function baseIdOf(id) { return String(id).split(".")[0]; }
function spouseOf(id) {
  const base = baseIdOf(id);
  return isSpouse(id) ? base : `${base}.1`;
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

function getParent(baseStr) {
  const len = baseStr.length;
  let i = len - 1;
  while (i >= 0 && baseStr[i] === "0") i--;
  if (i < 0) return null;
  const place = len - 1 - i;
  const placeValue = Math.pow(10, place);
  if (i === 0) return null;
  let parentStr = setDigitAtPlace(baseStr, placeValue, 0);
  for (let p = place - 1; p >= 0; p--) {
    parentStr = setDigitAtPlace(parentStr, Math.pow(10, p), 0);
  }
  return parentStr;
}

function getChildren(baseStr) {
  const len = baseStr.length;
  let i = len - 1;
  while (i >= 0 && baseStr[i] === "0") i--;
  if (i < 0) return [];
  const currentPlace = len - 1 - i;
  const childPlace = currentPlace - 1;
  if (childPlace < 0) return [];
  const placeValue = Math.pow(10, childPlace);
  const children = [];
  for (let d = 1; d <= 9; d++) {
    let s = setDigitAtPlace(baseStr, placeValue, d);
    for (let p = childPlace - 1; p >= 0; p--) s = setDigitAtPlace(s, Math.pow(10, p), 0);
    children.push(s);
  }
  return children;
}

function getSiblings(baseStr) {
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
    for (let p = place - 1; p >= 0; p--) s = setDigitAtPlace(s, Math.pow(10, p), 0);
    sibs.push(s);
  }
  return sibs;
}

function idTitle(id) { return String(id); }

function renderAnchor(id) {
  anchorId = id;
  setImg(els.anchorImg, id);
  els.anchorLabel.textContent = idTitle(id);
  els.backBtn.disabled = historyStack.length === 0;
  try {
    const hash = `#id=${encodeURIComponent(id)}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  } catch {}
}

function buildCard(id, roleText) {
  const card = document.createElement("div");
  card.className = "card";
  const img = document.createElement("img");
  setImg(img, id);
  const titleEl = document.createElement("div");
  titleEl.className = "title";
  titleEl.textContent = id;
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = roleText;
  card.appendChild(img);
  card.appendChild(titleEl);
  card.appendChild(meta);
  card.addEventListener("click", () => {
    historyStack.push(anchorId);
    closeOverlay();
    renderAnchor(id);
  });
  return card;
}

async function openOverlayFiltered(title, ids, opts = {}) {
  const results = await Promise.all(ids.map(id => checkImgExists(id)));
  const filtered = ids.filter((_, i) => results[i]);
  if (filtered.length === 0) return;

  overlayOpen = true;
  els.overlayTitle.textContent = title;
  els.grid.innerHTML = "";

  if (opts.parentsLayout) els.grid.classList.add("parents");
  else els.grid.classList.remove("parents");

  filtered.forEach((id) => {
    const role =
      title.includes("Parent") ? "Parent" :
      title.includes("Sibling") ? "Sibling" :
      title.includes("Spouse")  ? "Spouse"  : "Child";
    els.grid.appendChild(buildCard(id, role));
  });

  els.overlay.classList.remove("hidden");
}

function closeOverlay() {
  overlayOpen = false;
  els.overlay.classList.add("hidden");
  els.grid.innerHTML = "";
  els.grid.classList.remove("parents");
}

async function showParents() {
  const base = baseIdOf(anchorId);
  const parent = getParent(base);
  const ids = [];
  if (parent) {
    ids.push(parent);
    ids.push(parent + ".1");
  }
  await openOverlayFiltered("Parents", ids, { parentsLayout: true });
}

async function showChildren() {
  const base = baseIdOf(anchorId);
  const kids = getChildren(base);
  await openOverlayFiltered("Children", kids);
}

async function showSiblings() {
  const base = baseIdOf(anchorId);
  const sibs = getSiblings(base);
  await openOverlayFiltered("Siblings", sibs);
}

async function showSpouse() {
  const sid = spouseOf(anchorId);
  await openOverlayFiltered("Spouse", [sid]);
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
      if (dx > 0) showSpouse();
      else showSiblings();
    } else {
      if (dy < 0) showParents();
      else showChildren();
    }
  }, { passive: true });
}

function boot() {
  els.startBtn.addEventListener("click", () => startWith(els.startId.value));
  els.backBtn.addEventListener("click", onBack);
  els.closeOverlay.addEventListener("click", closeOverlay);

  const hid = parseHash();
  if (hid) {
    els.startId.value = hid;
    startWith(hid);
  } else {
    els.anchorImg.src = CONFIG.PLACEHOLDER;
    els.anchorLabel.textContent = "Enter an ID and press Start";
  }

  setupSwipes();
}

document.addEventListener("DOMContentLoaded", boot);
