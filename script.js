// ===== SwipeTree GitHub CDN Script (2025-08-12) =====
// Loads images from GitHub via jsDelivr by default, but lets you set a custom BASE_URL in Settings.
// Also includes:
//  - Dynamic grid (hides unused cells)
//  - Tap highlight + anchor trail
//  - Double-tap Name/DOB editor (localStorage)
//  - Swipe gestures (parents/children/siblings/spouse)
//
const startBtn = document.getElementById('startBtn');
const backBtn = document.getElementById('backBtn');
const settingsBtn = document.getElementById('settingsBtn');
const anchorImg = document.getElementById('anchorImg');
const anchorCaption = document.getElementById('anchorCaption');
const gridArea = document.getElementById('gridArea');
const stage = document.getElementById('stage');

let historyStack = [];
let anchorId = null;
let mode = null; // 'parents'|'children'|'siblings'|'spouse'

// ===== Settings: BASE_URL for images =====
// Default to user's known repo path; can be changed in "Settings"
const DEFAULT_BASE_URL = "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";
function getBaseUrl() {
  return localStorage.getItem('swipetree:base_url') || DEFAULT_BASE_URL;
}
function setBaseUrl(u) {
  localStorage.setItem('swipetree:base_url', u);
}

// ===== Profile storage (name/DOB) =====
function idKey(id) { return `profile:${id}`; }
function saveProfile(id, data) { localStorage.setItem(idKey(id), JSON.stringify(data)); }
function loadProfile(id) {
  try { return JSON.parse(localStorage.getItem(idKey(id))) || null; } catch { return null; }
}
function captionFor(id) {
  const p = loadProfile(id);
  const name = p?.name || "";
  const dob = p?.dob || "";
  return name || dob ? `${name}${name && dob ? " · " : ""}${dob}` : "";
}

// ===== Robust image loader with extension fallbacks =====
const EXT_CANDIDATES = [".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG"];
function setImageWithFallback(imgEl, id, onDone) {
  const base = getBaseUrl();
  let i = 0;
  function tryNext() {
    if (i >= EXT_CANDIDATES.length) { onDone?.(false); return; }
    const url = `${base}${id}${EXT_CANDIDATES[i++]}`;
    imgEl.onerror = tryNext;
    imgEl.onload = () => onDone?.(true);
    imgEl.src = url;
    imgEl.alt = `${id}`;
  }
  tryNext();
}

// ===== Anchor handling =====
function setAnchor(id, animateTrail = true) {
  anchorId = id;
  anchorImg.classList.remove('anchor-trail');
  setImageWithFallback(anchorImg, id, () => {
    if (animateTrail) requestAnimationFrame(() => anchorImg.classList.add('anchor-trail'));
  });
  anchorCaption.textContent = captionFor(id);
}

// ===== Double-tap editor (anchor & cells) =====
const dblTapThreshold = 280;
let lastTapTime = 0;
function handleDoubleTap(targetId) {
  const now = Date.now();
  if (now - lastTapTime < dblTapThreshold) {
    const current = loadProfile(targetId) || {};
    const name = prompt('Edit name', current.name || '') ?? current.name || '';
    const dob = prompt('Edit DOB', current.dob || '') ?? current.dob || '';
    saveProfile(targetId, { name, dob });
    // refresh captions
    if (targetId === anchorId) {
      anchorCaption.textContent = captionFor(targetId);
    } else {
      const label = gridArea.querySelector(`[data-id="${targetId}"] .label`);
      if (label) label.textContent = captionFor(targetId);
    }
  }
  lastTapTime = now;
}

// ===== Tap highlight feedback =====
function flashTap(el) {
  el.classList.remove('tapped');
  void el.offsetWidth;
  el.classList.add('tapped');
}

// ===== Swipe detection =====
let touchStartX = 0, touchStartY = 0, swiping = false;
stage.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX; touchStartY = t.clientY;
  swiping = true;
}, { passive: true });
stage.addEventListener('touchend', (e) => {
  if (!swiping) return; swiping = false;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const absX = Math.abs(dx), absY = Math.abs(dy);
  const threshold = 40;
  if (absX < threshold && absY < threshold) return;
  if (absX > absY) { if (dx > 0) showSpouse(); else showSiblings(); }
  else { if (dy > 0) showChildren(); else showParents(); }
}, { passive: true });

// ===== Grid rendering =====
function setGrid(items, kind, animInClass) {
  mode = kind;
  const n = items.length;
  gridArea.className = `grid-area visible grid-${Math.max(1, Math.min(9, n || 1))}`;
  gridArea.innerHTML = '';

  items.forEach(id => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.id = String(id);

    const img = document.createElement('img');
    // Fallback loading per id
    setImageWithFallback(img, id, (ok) => { if (!ok) cell.classList.add('hidden'); });

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = captionFor(id);

    cell.appendChild(img);
    cell.appendChild(label);
    gridArea.appendChild(cell);

    cell.addEventListener('touchstart', () => { flashTap(cell); handleDoubleTap(id); }, { passive: true });
    cell.addEventListener('click', () => { flashTap(cell); handleDoubleTap(id); });
  });

  gridArea.classList.add(animInClass);
  setTimeout(() => gridArea.classList.remove(animInClass), 260);
}

// Hide grid
function hideGrid() {
  if (!gridArea.classList.contains('visible')) return;
  gridArea.classList.add('slide-out-down');
  setTimeout(() => { gridArea.classList.remove('visible', 'slide-out-down'); gridArea.innerHTML = ''; }, 200);
}

// ===== Relationship stubs (replace with your calculators) =====
function getParents(id) {
  const base = String(id).replace(/\..*$/, '');
  const first = base[0] || '1';
  const p1 = first + '00000';
  const p2 = String(Number(first)+1) + '00000';
  return [p1, p2];
}
function getChildren(id) {
  const count = (Number(String(id).slice(-1)) % 5);
  return Array.from({length: count}, (_,i) => Number(String(id).replace(/\..*$/,'')) + (i+1) * 1000);
}
function getSiblings(id) {
  const base = Number(String(id).slice(0,1)) * 100000;
  return [base + 10000, base + 20000, base + 30000].filter(v => String(v) !== String(id));
}
function getSpouse(id) {
  const s = String(id);
  return s.includes('.1') ? s.replace('.1','') : s + '.1';
}

// ===== Views =====
function showParents()  { historyStack.push({ anchorId, mode }); setGrid(getParents(anchorId),  'parents',  'slide-in-up'); }
function showChildren() { historyStack.push({ anchorId, mode }); setGrid(getChildren(anchorId), 'children', 'slide-in-down'); }
function showSiblings() { historyStack.push({ anchorId, mode }); setGrid(getSiblings(anchorId), 'siblings', 'slide-in-left'); }
function showSpouse()   { historyStack.push({ anchorId, mode }); setGrid([getSpouse(anchorId)], 'spouse', 'slide-in-right'); }

// ===== Buttons =====
backBtn.addEventListener('click', () => {
  if (!historyStack.length) { hideGrid(); return; }
  hideGrid();
  historyStack.pop();
});

startBtn.addEventListener('click', () => {
  const input = prompt('Enter starting ID (e.g., 140000):', anchorId || '');
  if (!input) return;
  if (anchorId) historyStack.push({ anchorId, mode: null });
  setAnchor(input);
  hideGrid();
});

settingsBtn.addEventListener('click', () => {
  const current = getBaseUrl();
  const next = prompt('Set image BASE URL (end with /)', current);
  if (next && next.endsWith('/')) setBaseUrl(next);
  else if (next) alert('Please ensure the URL ends with a slash /');
});

// Anchor clicks: edit
anchorImg.addEventListener('touchstart', () => handleDoubleTap(anchorId), { passive: true });
anchorImg.addEventListener('click', () => handleDoubleTap(anchorId));

// ===== Init =====
(function init() {
  // Guide: If user hasn't set BASE URL, we keep default (their jsDelivr repo)
  const initial = prompt('Enter starting ID (e.g., 140000):', '') || '140000';
  setAnchor(initial, true);
})();
