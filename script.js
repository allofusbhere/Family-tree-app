// ---- Utility: Debug logging ----
const log = (...args) => {
  const el = document.getElementById('debugLog');
  if (!el) return;
  el.textContent += args.join(' ') + "\n";
  el.scrollTop = el.scrollHeight;
};
const setStatus = (t) => document.getElementById('status').textContent = t;

// ---- Config ----
const { IMAGE_BASE, MAX_RESULTS } = window.APP_CONFIG;

// Try loading an image by trying multiple extensions and locations.
// Order: CDN with .jpg/.JPG/.jpeg/.JPEG/.png/.PNG, then same-folder as fallback.
const EXT_TRIES = ['.jpg','.JPG','.jpeg','.JPEG','.png','.PNG'];

// Returns a Promise that resolves to a found URL (string) or null
function resolveImageUrl(id) {
  const bare = String(id);
  const tryUrls = [];

  // CDN tries
  for (const ext of EXT_TRIES) {
    tryUrls.push(IMAGE_BASE + bare + ext);
  }
  // Fallback: same folder relative (useful if images sit beside the app)
  for (const ext of EXT_TRIES) {
    tryUrls.push(bare + ext);
  }

  return new Promise((resolve) => {
    let i = 0;
    const img = new Image();
    img.onload = () => resolve(tryUrls[i-1] || null);
    img.onerror = () => {
      i++;
      if (i >= tryUrls.length) {
        resolve(null);
      } else {
        img.src = tryUrls[i];
      }
    };
    // Kick off
    img.src = tryUrls[i];
  });
}

// Load anchor image with robust resolution
async function loadAnchor(id) {
  setStatus('Loading anchor...');
  const url = await resolveImageUrl(id);
  const anchorImg = document.getElementById('anchorImg');
  const idEl = document.getElementById('anchorId');

  if (url) {
    anchorImg.src = url;
    idEl.textContent = id;
    setStatus('Anchor loaded');
    log('[ANCHOR]', id, '->', url);
  } else {
    anchorImg.removeAttribute('src');
    idEl.textContent = id + ' (image not found)';
    setStatus('Anchor missing image');
    log('[ERROR] Anchor image not found for', id);
  }
}

// Simple in-memory name/dob edits (double-tap to edit later if needed)
const metaStore = new Map();

// History stack
const historyStack = [];

// Strip spouse suffix (.1 or .2 etc) from ids when needed
function stripExtension(id) {
  return String(id).split('.')[0];
}

// Determine the current generation multiplier and parent for an ID.
// Logic: take the first non-zero digit *after* the first digit as "generation digit".
// Parent = id with that digit zeroed. If none, return null.
function computeParent(id) {
  const clean = stripExtension(id);
  const s = clean.toString();
  const n = s.length;
  // positions: 10^(n-1), 10^(n-2), ... 1
  const digits = s.split('').map(d => parseInt(d,10));
  // Skip the very first digit (branch). Find the first non-zero after it.
  let idx = -1; // index in digits
  for (let i = 1; i < n; i++) {
    if (digits[i] !== 0) { idx = i; break; }
  }
  if (idx === -1) {
    // If no non-zero after the first, treat as root-level; parent is null.
    return { parent: null, genMult: Math.pow(10, n-2) }; // child step likely next place
  }
  const genMult = Math.pow(10, n - 1 - idx);
  const parentVal = parseInt(clean, 10) - (digits[idx] * genMult);
  return { parent: parentVal, genMult };
}

// Build siblings by varying the generation digit 1..9 at the same genMult around the parent.
function buildSiblings(id, limit = MAX_RESULTS) {
  const clean = parseInt(stripExtension(id), 10);
  const { parent, genMult } = computeParent(clean);
  if (parent === null) return [];
  const siblings = [];
  for (let k = 1; k <= 9; k++) {
    const sib = parent + k * genMult;
    if (sib !== clean) siblings.push(sib);
    if (siblings.length >= limit) break;
  }
  return siblings;
}

// Build children by using the next-lower digit place (genMult/10) 1..9
function buildChildren(id, limit = MAX_RESULTS) {
  const clean = parseInt(stripExtension(id), 10);
  const { genMult } = computeParent(clean);
  let childMult = Math.floor(genMult / 10);
  if (childMult <= 0) childMult = 1; // deepest level safety
  const base = clean;
  const kids = [];
  for (let k = 1; k <= 9; k++) {
    kids.push(base + k * childMult);
    if (kids.length >= limit) break;
  }
  return kids;
}

// Spouse: try .1 partner image for the same id, and (optionally) for the partner id if detected later.
function buildSpouseIds(id) {
  const clean = stripExtension(id);
  return [clean + '.1'];
}

// Render results grid (clears previous, shows only found images)
async function renderGrid(ids) {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  let shown = 0;
  for (const id of ids) {
    const url = await resolveImageUrl(id);
    if (!url) { log('[MISS]', id); continue; }
    const card = document.createElement('div');
    card.className = 'card';
    const img = document.createElement('img');
    img.src = url;
    img.alt = String(id);
    const cap = document.createElement('div');
    cap.className = 'caption';
    cap.textContent = String(id);
    card.appendChild(img);
    card.appendChild(cap);
    card.addEventListener('click', () => {
      historyStack.push(currentId);
      setAnchor(id);
    });
    grid.appendChild(card);
    shown++;
  }
  setStatus(`Showing ${shown} result(s)`);
}

// Anchor state
let currentId = null;

async function setAnchor(id) {
  currentId = String(id);
  await loadAnchor(currentId);
  // Anchor-only on load: clear the grid
  document.getElementById('grid').innerHTML = '';
}

// Button events
async function onParents() {
  const { parent } = computeParent(currentId);
  const ids = [];
  if (parent !== null) ids.push(parent);
  // if we want a placeholder parent2 someday, we can add here.
  await renderGrid(ids);
}
async function onSiblings() {
  const ids = buildSiblings(currentId);
  await renderGrid(ids);
}
async function onChildren() {
  const ids = buildChildren(currentId);
  await renderGrid(ids);
}
async function onSpouse() {
  const ids = buildSpouseIds(currentId);
  await renderGrid(ids);
}
function onBack() {
  const prev = historyStack.pop();
  if (prev) setAnchor(prev);
}

// Init
window.addEventListener('DOMContentLoaded', async () => {
  // Prompt for start ID (no hardcoding)
  let start = prompt('Enter starting ID (e.g., 140000):', '140000');
  if (!start) start = '140000';
  await setAnchor(start);

  document.getElementById('btnParent').addEventListener('click', onParents);
  document.getElementById('btnSiblings').addEventListener('click', onSiblings);
  document.getElementById('btnChildren').addEventListener('click', onChildren);
  document.getElementById('btnSpouse').addEventListener('click', onSpouse);
  document.getElementById('btnBack').addEventListener('click', onBack);
});