// SwipeTree — Spouse-Only Build (2025-08-18b)
// Right-swipe toggles between anchor and spouse, no other gestures.
// Images are loaded from the separate images repo by default.

const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/'; // trailing slash required
const CACHE_TAG = '20250818b';
const SPOUSE_JSON_URL = 'spouse_links.json?v=' + CACHE_TAG;

let SPOUSE_MAP = null;
let currentId = null;
let lastId = null;

// --- Utils ---
function getQueryId() {
  const u = new URL(window.location.href);
  return u.searchParams.get('id') || window.location.hash.replace('#','') || null;
}

function imgUrlFor(id) {
  return IMAGE_BASE + encodeURIComponent(id) + '.jpg?v=' + CACHE_TAG;
}

async function loadSpouseMap() {
  if (SPOUSE_MAP) return SPOUSE_MAP;
  try {
    const res = await fetch(SPOUSE_JSON_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    SPOUSE_MAP = await res.json();
  } catch (e) {
    console.warn('spouse_links.json not found or invalid, using fallback only.', e);
    SPOUSE_MAP = {}
  }
  return SPOUSE_MAP;
}

// Returns spouse id for a given id. Supports cross-branch map and .1 files.
async function resolveSpouse(id) {
  const map = await loadSpouseMap();

  // If id looks like "140000.1", spouse is "140000"
  if (/^\d+\.1$/.test(id)) return id.split('.').slice(0,1)[0];

  // Direct mapping
  if (map[id]) return String(map[id]);

  // Reverse mapping
  for (const [k, v] of Object.entries(map)) {
    if (String(v) === String(id)) return String(k);
  }

  // Fallback rule: append .1
  return id + '.1';
}

function render(id) {
  const img = document.getElementById('anchorImg');
  const caption = document.getElementById('caption');
  img.src = imgUrlFor(id);
  caption.textContent = id;
  document.title = 'SwipeTree — ' + id;
  window.location.hash = id;
}

async function goTo(id) {
  if (!id) return;
  lastId = currentId;
  currentId = id;
  render(id);
}

async function toggleSpouse() {
  const spouseId = await resolveSpouse(currentId);
  await goTo(spouseId);
}

// --- Swipe handling (touch) ---
let touchStartX = 0, touchStartY = 0, touching = false;
const SWIPE_THRESH = 50; // px

function onTouchStart(e) {
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touching = true;
}

function onTouchEnd(e) {
  if (!touching) return;
  touching = false;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && dx > SWIPE_THRESH) {
    // right swipe
    toggleSpouse();
  }
}

// Keyboard (for desktop testing)
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') toggleSpouse();
});

// Init
window.addEventListener('load', () => {
  document.body.addEventListener('touchstart', onTouchStart, { passive: true });
  document.body.addEventListener('touchend', onTouchEnd, { passive: true });

  const start = getQueryId() || '100000';
  goTo(start);
});
