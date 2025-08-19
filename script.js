// script.js — image base set to your `family-tree-images` repo
const IMAGE_BASE = 'https://allofusbhere.github.io/family-tree-images/';
const MAP_URL = 'spouse_links.json?v=imgbase1';

let SPOUSES = null;
let current = null;
const q = s => document.querySelector(s);

function startId() {
  const u = new URL(location.href);
  return u.searchParams.get('id') || location.hash.replace('#','') || '100000';
}
function baseId(id){ return String(id).split('.')[0]; }
function imgUrl(id){ return IMAGE_BASE + encodeURIComponent(baseId(id)) + '.jpg'; }

async function loadMap(){
  if (SPOUSES) return SPOUSES;
  try {
    const r = await fetch(MAP_URL, {cache:'no-store'});
    if (!r.ok) throw new Error('HTTP '+r.status);
    SPOUSES = await r.json();
  } catch(e){
    SPOUSES = {};
  }
  return SPOUSES;
}
async function spouseOf(id){
  const b = baseId(id);
  const map = await loadMap();
  if (/^\d+\.1$/.test(id)) return b;           // if spouse file, go back to base
  if (map[b]) return String(map[b]);             // direct map
  for (const [k,v] of Object.entries(map)) {     // reverse map
    if (String(v) === b) return String(k);
  }
  return b + '.1';                                // fallback to .1 image
}

function render(id){
  const img = q('#anchorImg');
  if (img) img.src = imgUrl(id);
  const cap = q('#caption');
  if (cap) cap.textContent = id;
  document.title = 'SwipeTree — ' + id;
  location.hash = id;
}
async function go(id){ current = id; render(id); }
async function toggle(){ const s = await spouseOf(current); go(s); }

// touch right-swipe
let sx=0, sy=0, touching=false;
const TH=50;
function onDown(e){ const t=e.changedTouches[0]; sx=t.clientX; sy=t.clientY; touching=true; }
async function onUp(e){
  if(!touching) return; touching=false;
  const t=e.changedTouches[0]; const dx=t.clientX-sx; const dy=t.clientY-sy;
  if(Math.abs(dx)>Math.abs(dy) && dx>TH){ await toggle(); }
}
document.addEventListener('keydown', e=>{ if(e.key==='ArrowRight') toggle(); });

function init(){
  document.body.addEventListener('touchstart', onDown, {passive:true});
  document.body.addEventListener('touchend', onUp, {passive:true});
  go(startId());
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}
