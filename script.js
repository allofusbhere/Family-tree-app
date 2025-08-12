// ===== SwipeTree iPad Test Script (2025-08-12) =====
// Focus: (1) Hide unused grid cells + auto sizing, (2) Tap highlight feedback & visible anchor motion,
// (3) Double-tap name/DOB editor, (4) Prevent "half-face" cropping via object-fit:contain & centering.
// NOTE: Relationship calculations are assumed to exist; here we stub with demo functions so UI can be tested.

const startBtn = document.getElementById('startBtn');
const backBtn = document.getElementById('backBtn');
const anchorImg = document.getElementById('anchorImg');
const anchorCaption = document.getElementById('anchorCaption');
const gridArea = document.getElementById('gridArea');
const stage = document.getElementById('stage');

let historyStack = [];
let anchorId = null;
let mode = null; // 'parents'|'children'|'siblings'|'spouse' for which grid is visible

// ===== Utilities =====
function idKey(id) { return `profile:${id}`; }
function saveProfile(id, data) {
  localStorage.setItem(idKey(id), JSON.stringify(data));
}
function loadProfile(id) {
  try {
    return JSON.parse(localStorage.getItem(idKey(id))) || null;
  } catch { return null; }
}
function nameFor(id) {
  const p = loadProfile(id);
  return p?.name || '';
}
function dobFor(id) {
  const p = loadProfile(id);
  return p?.dob || '';
}
function captionFor(id) {
  const name = nameFor(id);
  const dob = dobFor(id);
  return name || dob ? `${name}${name && dob ? ' · ' : ''}${dob}` : '';
}

// ===== Image helpers =====
function imgPathFor(id) {
  // Support .jpg/.JPG/.jpeg/.JPEG
  // For cloud builds this could be a CDN base; for local tests files sit next to HTML.
  const candidates = [`${id}.jpg`, `${id}.JPG`, `${id}.jpeg`, `${id}.JPEG`];
  return candidates[0]; // UI only; actual existence is handled by <img onerror>
}

function setAnchor(id, animateTrail = true) {
  anchorId = id;
  const src = imgPathFor(id);
  anchorImg.classList.remove('anchor-trail');
  anchorImg.src = src;
  anchorImg.alt = `Anchor ${id}`;
  anchorCaption.textContent = captionFor(id);
  // Reflow then animate subtle trail for visibility
  if (animateTrail) requestAnimationFrame(() => anchorImg.classList.add('anchor-trail'));
}

// ===== Double-tap editor (works on anchor & grid cells) =====
const dblTapThreshold = 280; // ms
let lastTapTime = 0;
function handleDoubleTap(targetId) {
  const now = Date.now();
  if (now - lastTapTime < dblTapThreshold) {
    // Open inline prompts (minimal for now)
    const current = loadProfile(targetId) || {};
    const name = prompt('Edit name', current.name || '') ?? current.name || '';
    const dob = prompt('Edit DOB', current.dob || '') ?? current.dob || '';
    saveProfile(targetId, { name, dob });
    if (targetId === anchorId) {
      anchorCaption.textContent = captionFor(targetId);
    } else {
      const cell = gridArea.querySelector(`[data-id="${targetId}"] .label`);
      if (cell) cell.textContent = captionFor(targetId);
    }
  }
  lastTapTime = now;
}

// ===== Tap highlight feedback =====
function flashTap(el) {
  el.classList.remove('tapped');
  // force reflow so animation can replay
  void el.offsetWidth;
  el.classList.add('tapped');
}

// ===== Swipe detection =====
let touchStartX = 0, touchStartY = 0;
let swiping = false;

stage.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX; touchStartY = t.clientY;
  swiping = true;
}, { passive: true });

stage.addEventListener('touchmove', (e) => {
  // We intentionally do not translate UI with finger to keep it snappy & simple.
}, { passive: true });

stage.addEventListener('touchend', (e) => {
  if (!swiping) return;
  swiping = false;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const absX = Math.abs(dx), absY = Math.abs(dy);
  const threshold = 40; // px

  if (absX < threshold && absY < threshold) return; // tap, not swipe
  if (absX > absY) {
    if (dx > 0) showSpouse(); else showSiblings();
  } else {
    if (dy > 0) showChildren(); else showParents();
  }
});

// ===== Grid rendering =====
function setGrid(items, kind, animInClass) {
  mode = kind;
  // Decide columns based on count
  const n = items.length;
  gridArea.className = `grid-area visible grid-${Math.max(1, Math.min(9, n || 1))}`;

  // Clear & rebuild
  gridArea.innerHTML = '';
  items.forEach(id => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.id = String(id);

    const img = document.createElement('img');
    img.alt = `${kind} ${id}`;
    img.src = imgPathFor(id);
    img.onerror = () => {
      // Hide cell if image missing
      cell.classList.add('hidden');
    };

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = captionFor(id);

    cell.appendChild(img);
    cell.appendChild(label);
    gridArea.appendChild(cell);

    // Tap / double-tap handlers
    cell.addEventListener('touchstart', () => {
      flashTap(cell);
      handleDoubleTap(id);
    }, { passive: true });

    cell.addEventListener('click', () => {
      flashTap(cell);
      handleDoubleTap(id);
    });
  });

  // Apply entrance animation to grid for visibility
  gridArea.classList.add(animInClass);
  setTimeout(() => gridArea.classList.remove(animInClass), 260);

  // Hide anchor behind grid while grid is visible
  // (anchor still centered; we keep it visible so the "trail" remains perceptible)
}

// Hide grid (when moving back to anchor-only view)
function hideGrid(animOutClass) {
  if (!gridArea.classList.contains('visible')) return;
  gridArea.classList.add(animOutClass);
  setTimeout(() => {
    gridArea.classList.remove('visible', animOutClass);
    gridArea.innerHTML = '';
  }, 200);
}

// ===== Relationship stubs (replace with real calculators in your build) =====
function getParents(id) {
  // Stub: if id ends with '000', return two placeholder-ish parent IDs
  const base = String(id).replace(/\..*$/, '');
  const p1 = base.length > 1 ? base[0] + '00000' : '000000';
  const p2 = base.length > 1 ? String(Number(base[0]) + 1) + '00000' : '100000';
  return [p1, p2];
}
function getChildren(id) {
  // Stub: produce 0..5 synthetic children for demo
  const count = (Number(String(id).slice(-1)) % 5);
  return Array.from({length: count}, (_,i) => Number(id) + (i+1) * 1000);
}
function getSiblings(id) {
  // Stub: some synthetic siblings for demo
  const base = Number(String(id).slice(0,1)) * 100000;
  return [base + 10000, base + 20000, base + 30000].filter(v => String(v) !== String(id));
}
function getSpouse(id) {
  // Supports .1 partner variant
  const s = String(id);
  return s.includes('.1') ? s.replace('.1','') : s + '.1';
}

// ===== Navigation views =====
function showParents() {
  historyStack.push({ anchorId, mode });
  const items = getParents(anchorId);
  setGrid(items, 'parents', 'slide-in-up');
}
function showChildren() {
  historyStack.push({ anchorId, mode });
  const items = getChildren(anchorId);
  setGrid(items, 'children', 'slide-in-down');
}
function showSiblings() {
  historyStack.push({ anchorId, mode });
  const items = getSiblings(anchorId);
  setGrid(items, 'siblings', 'slide-in-left');
}
function showSpouse() {
  historyStack.push({ anchorId, mode });
  const sp = getSpouse(anchorId);
  setGrid([sp], 'spouse', 'slide-in-right');
}

// ===== Back & Start =====
backBtn.addEventListener('click', () => {
  if (!historyStack.length) { hideGrid('slide-out-down'); return; }
  // First hide current grid
  hideGrid('slide-out-down');
  const prev = historyStack.pop();
  // Return to previous anchor view (we keep same anchor)
});

startBtn.addEventListener('click', () => {
  const input = prompt('Enter starting ID (e.g., 140000):', anchorId || '');
  if (!input) return;
  // Push current to history then set
  if (anchorId) historyStack.push({ anchorId, mode: null });
  setAnchor(input);
  hideGrid('slide-out-down');
});

// Clicking the anchor: double-tap edit & subtle trail
anchorImg.addEventListener('touchstart', () => handleDoubleTap(anchorId), { passive: true });
anchorImg.addEventListener('click', () => handleDoubleTap(anchorId));

// ===== Init =====
(function init() {
  // Ask for an ID at launch to avoid hardcoding
  const initial = prompt('Enter starting ID (e.g., 140000):', '') || '140000';
  setAnchor(initial, /* trail */ true);
})();
