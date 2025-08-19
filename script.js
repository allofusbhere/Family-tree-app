// SwipeTree — Main Script (with spouse link loader)

const SPOUSE_JSON_URL = 'spouse_links.json?v=20250818a';
let SPOUSE_LINKS = null;

// ---- Load spouse_links.json (with cache-busting) ----
async function loadSpouseLinks() {
  if (SPOUSE_LINKS) return SPOUSE_LINKS;
  try {
    const res = await fetch(SPOUSE_JSON_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    SPOUSE_LINKS = await res.json();
  } catch (err) {
    console.warn('Spouse links JSON not found, using fallback:', err);
    SPOUSE_LINKS = {};
  }
  return SPOUSE_LINKS;
}

// ---- Resolve spouse ID for a given anchor ----
async function resolveSpouseId(anchorId) {
  const map = await loadSpouseLinks();

  // 1) Direct mapping (cross-branch)
  if (map && map[anchorId]) return String(map[anchorId]);

  // 2) Symmetric (reverse mapping)
  const inverse = Object.entries(map).find(([k, v]) => String(v) === String(anchorId));
  if (inverse) return String(inverse[0]);

  // 3) Fallback: append .1
  return `${anchorId}.1`;
}

// ---- Example swipe-right handler ----
// Replace your old spouse logic with this
async function handleSwipeRight() {
  const nextSpouseId = await resolveSpouseId(currentAnchorId);
  navigateTo(nextSpouseId);
}

// ---- Existing app init ----
let currentAnchorId = "100000"; // or your dynamic start
function navigateTo(id) {
  currentAnchorId = id;
  console.log("Navigating to:", id);
  // your existing image/render logic here
}

// Example: hook up swipe listener
document.addEventListener('keydown', async (e) => {
  if (e.key === "ArrowRight") {
    await handleSwipeRight();
  }
});