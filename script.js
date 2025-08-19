
// SwipeTree — Full Swipe Build (20250818d)
// Right=Spouse toggle, Left=Siblings grid, Down=Children grid, Up=Parents grid
// Strict numeric-derivation; spouse cross-branch via spouse_links.json.

const BUILD_TAG = '20250818d';
const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
const SPOUSE_JSON_URL = 'spouse_links.json?v=' + BUILD_TAG;

let SPOUSE_MAP = null;
let currentId = null;
const historyStack = [];

const q = sel => document.querySelector(sel);

function baseId(id) { return String(id).split('.')[0]; }
function imgUrlFor(id) { return IMAGE_BASE + encodeURIComponent(id) + '.jpg?v=' + BUILD_TAG; }

async function loadSpouseMap() {
  if (SPOUSE_MAP) return SPOUSE_MAP;
  try {
    const res = await fetch(SPOUSE_JSON_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    SPOUSE_MAP = await res.json();
  } catch (e) {
    console.warn('No spouse_links.json; fallback only.', e);
    SPOUSE_MAP = {};
  }
  return SPOUSE_MAP;
}

async function resolveSpouse(id) {
  const b = baseId(id);
  const map = await loadSpouseMap();
  if (/^\d+\.1$/.test(id)) return b;       // spouse file -> base
  if (map[b]) return String(map[b]);         // direct map
  for (const [k,v] of Object.entries(map)) { // reverse map
    if (String(v) === String(b)) return String(k);
  }
  return b + '.1';                            // fallback
}

// --- Digit helpers (6-digit IDs) ---
function toDigits(id) {
  const s = baseId(id).padStart(6, '0');
  return s.split('').map(d => parseInt(d, 10));
}
function fromDigits(d) { return d.join(''); }
function rightmostNonZeroIndex(d) { for (let i=5;i>=0;i--) if (d[i]!==0) return i; return -1; }

function parentOf(id) {
  const d = toDigits(id);
  const idx = rightmostNonZeroIndex(d);
  if (idx <= 0) return null; // top of branch
  const p = d.slice();
  for (let i=idx;i<6;i++) p[i]=0;
  return fromDigits(p);
}
function childrenOf(id) {
  const d = toDigits(id);
  const idx = rightmostNonZeroIndex(d);
  const childIndex = Math.min(idx+1, 5);
  if (childIndex >= 6) return [];
  const base = d.slice();
  for (let i=childIndex+1;i<6;i++) base[i]=0;
  const res = [];
  for (let k=1;k<=9;k++) { const dd = base.slice(); dd[childIndex]=k; res.push(fromDigits(dd)); }
  return res;
}
function siblingsOf(id) {
  const b = baseId(id);
  const p = parentOf(b);
  if (!p) return [];
  return childrenOf(p).filter(x => x !== b);
}
async function parentsOf(id) {
  const b = baseId(id);
  const p = parentOf(b);
  if (!p) return [];
  const spouse = await resolveSpouse(p);
  const arr = [p];
  if (spouse && spouse !== p) arr.push(spouse);
  return arr.slice(0,2);
}

// --- Rendering ---
function renderAnchor(id) {
  q('#anchorImg').src = imgUrlFor(id);
  q('#caption').textContent = id;
  document.title = 'SwipeTree — ' + id;
  location.hash = id;
}
function goTo(id) {
  if (!id) return;
  if (currentId) historyStack.push(currentId);
  currentId = id;
  closeOverlay();
  renderAnchor(id);
}

// --- Overlay grid ---
function openOverlay(title, ids) {
  const overlay = q('#overlay');
  q('#overlayTitle').textContent = title;
  const grid = q('#grid');
  grid.innerHTML = '';
  ids.forEach(id => {
    const btn = document.createElement('button');
    btn.className = 'cell';
    const img = document.createElement('img');
    img.src = imgUrlFor(id);
    img.alt = id;
    const cap = document.createElement('div');
    cap.className = 'cellcap';
    cap.textContent = id;
    btn.append(img, cap);
    btn.addEventListener('click', () => goTo(id));
    grid.appendChild(btn);
  });
  overlay.hidden = false;
}
function closeOverlay() { q('#overlay').hidden = true; }

// --- Gestures ---
let sx=0, sy=0, touching=false;
const TH=45;
function onTouchStart(e){ const t=e.changedTouches[0]; sx=t.clientX; sy=t.clientY; touching=true; }
async function onTouchEnd(e){
  if(!touching) return; touching=false;
  const t=e.changedTouches[0]; const dx=t.clientX-sx; const dy=t.clientY-sy;
  const ax=Math.abs(dx), ay=Math.abs(dy);
  if(!q('#overlay').hidden) return; // ignore when grid open
  if(ax>ay && dx>TH){ const s=await resolveSpouse(currentId); goTo(s); return; }
  if(ax>ay && dx<-TH){ openOverlay('Siblings', siblingsOf(currentId).slice(0,9)); return; }
  if(ay>ax && dy>TH){ openOverlay('Children', childrenOf(currentId).slice(0,9)); return; }
  if(ay>ax && dy<-TH){ const pars=await parentsOf(currentId); openOverlay('Parents', pars); return; }
}

// Keyboard (desktop)
document.addEventListener('keydown', async e=>{
  if(!q('#overlay').hidden) return;
  if(e.key==='ArrowRight'){ const s=await resolveSpouse(currentId); goTo(s); }
  if(e.key==='ArrowLeft'){ openOverlay('Siblings', siblingsOf(currentId).slice(0,9)); }
  if(e.key==='ArrowDown'){ openOverlay('Children', childrenOf(currentId).slice(0,9)); }
  if(e.key==='ArrowUp'){ const pars=await parentsOf(currentId); openOverlay('Parents', pars); }
});

// Back + close
document.addEventListener('DOMContentLoaded', ()=>{
  q('#backBtn').addEventListener('click', ()=>{
    if(!q('#overlay').hidden) return closeOverlay();
    const prev = historyStack.pop();
    if(prev) goTo(prev);
  });
  q('#closeOverlay').addEventListener('click', closeOverlay);
});

// Init
window.addEventListener('load', ()=>{
  document.body.addEventListener('touchstart', onTouchStart, {passive:true});
  document.body.addEventListener('touchend', onTouchEnd, {passive:true});
  const u=new URL(location.href);
  const start=u.searchParams.get('id') || location.hash.replace('#','') || '100000';
  goTo(start);
});
