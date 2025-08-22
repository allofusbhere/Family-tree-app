
// app-hook.js — robust labels everywhere + iOS scroll guard (2025-08-22)
import { getLabelsBatch, setLabel } from './labels.js';

function extractIdFromSrc(src=''){
  try{
    const file = src.split('/').pop().split('?')[0].split('#')[0];
    const base = file.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
    if (/^\d+(\.\d+)?$/.test(base)) return base;
  }catch(e){}
  return null;
}
const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function collectVisibleIds(){
  const ids = new Set();
  qsa('.anchor img, .grid .tile img, .overlay .tile img').forEach(img => {
    const id = img.dataset.id || extractIdFromSrc(img.currentSrc || img.src);
    if (id) ids.add(id);
  });
  return Array.from(ids);
}

function ensureAnchorCaption(){
  let cap = document.querySelector('.anchor-caption');
  if (!cap){
    cap = document.createElement('div');
    cap.className = 'anchor-caption';
    (document.querySelector('#app') || document.body).appendChild(cap);
  }
  return cap;
}
function setCaption(img, text){
  if (img.closest('.anchor')){
    ensureAnchorCaption().textContent = text || '';
  }else{
    let cap = img.closest('.tile')?.querySelector('.caption');
    if (!cap && img.closest('.tile')){
      cap = document.createElement('div');
      cap.className = 'caption';
      img.closest('.tile').appendChild(cap);
    }
    if (cap) cap.textContent = text || '';
  }
}
function renderCaptions(map){
  qsa('.anchor img, .grid .tile img, .overlay .tile img').forEach(img => {
    const id = img.dataset.id || extractIdFromSrc(img.currentSrc || img.src);
    const info = (id && map[id]) || {};
    const text = [info.name, info.dob].filter(Boolean).join(' · ');
    setCaption(img, text);
  });
}
export async function refreshCaptions(){
  const ids = collectVisibleIds();
  if (!ids.length) return;
  try{
    const map = await getLabelsBatch(ids);
    renderCaptions(map);
  }catch(e){ console.error('Label fetch failed', e); }
}

// Hidden long-press editor
function bindLongPress(){
  let timer=null;
  const start = (el) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const id = el.dataset.id || extractIdFromSrc(el.currentSrc || el.src);
      if (!id) return;
      const current = el.closest('.tile')?.querySelector('.caption')?.textContent
        || document.querySelector('.anchor-caption')?.textContent || '';
      const [currName, currDob] = current.split(' · ');
      const name = prompt('Name:', currName || '');
      if (name === null) return;
      const dob = prompt('DOB:', currDob || '');
      try{
        await setLabel(id, { name, dob });
        await refreshCaptions();
        alert('Saved ✔');
      }catch(e){
        alert('Save failed — deploy Netlify function with @netlify/blobs');
      }
    }, 550);
  };
  const cancel = () => clearTimeout(timer);
  document.addEventListener('touchstart', e => {
    const img = e.target.closest('.anchor img, .grid .tile img, .overlay .tile img');
    if (img) start(img);
  }, {passive:true});
  ['touchend','touchcancel','touchmove','scroll'].forEach(ev => {
    document.addEventListener(ev, cancel, {passive:true});
  });
  document.addEventListener('mousedown', e => {
    const img = e.target.closest('.anchor img, .grid .tile img, .overlay .tile img');
    if (img) start(img);
  });
  document.addEventListener('mouseup', cancel);
  document.addEventListener('mouseleave', cancel);
}

// iOS page scroll prevention inside #app
function lockPageScroll(){
  const app = document.getElementById('app');
  if (!app) return;
  const prevent = (e) => e.preventDefault();
  app.addEventListener('touchmove', prevent, { passive:false });
  app.addEventListener('wheel', prevent, { passive:false });
}

// Observe DOM changes so captions refresh when grids open
function observeDom(){
  const mo = new MutationObserver(() => {
    clearTimeout(observeDom._t);
    observeDom._t = setTimeout(refreshCaptions, 80);
  });
  mo.observe(document.body, { subtree:true, childList:true, attributes:true });
}

document.addEventListener('DOMContentLoaded', () => {
  lockPageScroll();
  bindLongPress();
  observeDom();
  refreshCaptions();
});
