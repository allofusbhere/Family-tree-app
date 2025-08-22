(function(){
  'use strict';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // Block the default context menu / callout so our editor is frontmost
  document.addEventListener('contextmenu', e => e.preventDefault());

  function getHashId(){
    const m = location.hash.match(/id=(\d+(?:\.\d+)?)/);
    return m ? m[1] : null;
  }
  function setHashId(id){
    const url = new URL(location.href);
    url.hash = `id=${id}`;
    history.pushState({id}, "", url);
  }
  function digits(nStr){ return nStr.split('.')[0].length; }
  function padTo(len, n){ return n.toString().padStart(len,'0'); }
  function imgUrlForId(id){ return `${id}.jpg`; }

  function loadLabel(id){
    try{ return (JSON.parse(localStorage.getItem('labels')||'{}')[id]||""); }
    catch(e){ return ""; }
  }
  function saveLabel(id, name){
    try{
      const data = JSON.parse(localStorage.getItem('labels')||'{}');
      data[id] = name;
      localStorage.setItem('labels', JSON.stringify(data));
    }catch(e){}
  }
  function displayName(id){
    const n = (loadLabel(id)||"").trim();
    return n || id; // fallback to ID until named
  }

  function longPress(el, ms, onLong){
    let t=null;
    el.addEventListener('pointerdown', (ev)=>{
      // prevent iOS image callout path early
      ev.preventDefault();
      t = setTimeout(onLong, ms);
    });
    ['pointerup','pointerleave','pointercancel'].forEach(evt=>{
      el.addEventListener(evt, ()=>{ if(t){clearTimeout(t); t=null;} });
    });
  }

  // ===== Relationship rules =====
  function deriveSiblings(idStr){
    const base = idStr.split('.')[0];
    const len = digits(base);
    const n = parseInt(base,10);
    const place = 10000;
    const currentDigit = Math.floor(n / place) % 10;
    const floorToPlace = n - currentDigit*place;
    const out = [];
    for(let k=1;k<=9;k++){
      const sib = floorToPlace + k*place;
      if(sib !== n) out.push(padTo(len, sib));
    }
    return out;
  }
  function deriveChildren(idStr){
    const base = idStr.split('.')[0];
    const len = digits(base);
    const n = parseInt(base,10);
    const place = 1000;
    const currentDigit = Math.floor(n / place) % 10;
    const floorToPlace = n - currentDigit*place;
    const out = [];
    for(let k=1;k<=9;k++){
      out.push(padTo(len, floorToPlace + k*place));
    }
    return out;
  }
  function deriveParents(idStr){
    const base = idStr.split('.')[0];
    const len = digits(base);
    const n = parseInt(base,10);
    const k1000 = Math.floor(n/1000)%10;
    const k10000 = Math.floor(n/10000)%10;
    const parents = new Set();
    if(k1000>0){ parents.add(padTo(len, n - k1000*1000)); }
    else if(k10000>0){ parents.add(padTo(len, n - k10000*10000)); }
    return Array.from(parents);
  }

  // ===== State & DOM =====
  const historyStack = [];
  let anchorId = null;
  const anchorImg = $('#anchorImg');
  const anchorIdEl = $('#anchorId');
  const anchorNameEl = $('#anchorName');
  const grid = $('#grid');
  const tileTemplate = $('#tileTemplate');

  function setAnchor(id){
    if(anchorId && anchorId !== id) historyStack.push(anchorId);
    anchorId = id;
    anchorIdEl.textContent = id; // hidden via CSS
    anchorNameEl.textContent = displayName(id);

    const url = imgUrlForId(id);
    anchorImg.src = url;
    anchorImg.alt = `ID ${id}`;
    hideGrid();
  }

  function hideGrid(){ grid.innerHTML=''; grid.classList.add('hidden'); }

  function showGrid(ids){
    grid.innerHTML='';
    grid.classList.remove('hidden');
    ids.slice(0,9).forEach(id=>{
      const tile = tileTemplate.content.firstElementChild.cloneNode(true);
      const img = tile.querySelector('img');
      const nameSpan = tile.querySelector('.name');
      // Hide ID span (kept for structure)
      tile.querySelector('.id').textContent = "";
      nameSpan.textContent = displayName(id);

      img.src = imgUrlForId(id);
      img.addEventListener('error', ()=>{
        tile.remove();
        if(grid.children.length===0) grid.classList.add('hidden');
      });
      tile.addEventListener('click', ()=> setAnchor(id));
      grid.appendChild(tile);
    });
  }

  $('#btnSiblings').addEventListener('click', ()=>{
    if(!anchorId) return;
    showGrid(deriveSiblings(anchorId));
  });
  $('#btnChildren').addEventListener('click', ()=>{
    if(!anchorId) return;
    showGrid(deriveChildren(anchorId));
  });
  $('#btnParents').addEventListener('click', ()=>{
    if(!anchorId) return;
    showGrid(deriveParents(anchorId));
  });
  $('#btnBack').addEventListener('click', ()=>{
    if(historyStack.length) setAnchor(historyStack.pop());
  });

  // Long-press to edit (no OS menu)
  longPress(anchorImg, 500, ()=>{
    if(!anchorId) return;
    const current = (loadLabel(anchorId)||"").trim();
    const name = prompt(`Edit display name for ${anchorId}`, current);
    if(name !== null){
      const v = name.trim();
      saveLabel(anchorId, v);
      // Update both anchor and any visible tiles
      anchorNameEl.textContent = displayName(anchorId);
      $$('.tile .tile-label .name').forEach(el=>{
        // if a tile corresponds to anchor (rare), update; otherwise tiles update on render
      });
    }
  });

  function boot(){
    let id = getHashId() || "100000";
    setHashId(id);
    setAnchor(id);
  }
  window.addEventListener('popstate', (e)=>{
    const id = (e.state && e.state.id) || getHashId() || anchorId;
    if(id) setAnchor(id);
  });
  document.addEventListener('DOMContentLoaded', boot);
})();