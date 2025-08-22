(function(){
  'use strict';
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  document.addEventListener('contextmenu', e => e.preventDefault());

  function getHashId(){ const m=location.hash.match(/id=(\d+(?:\.\d+)?)/); return m?m[1]:null; }
  function setHashId(id){ const url=new URL(location.href); url.hash=`id=${id}`; history.pushState({id},"",url); }
  function digits(nStr){ return nStr.split('.')[0].length; }
  function padTo(len,n){ return n.toString().padStart(len,'0'); }

  // Pull images from the dedicated repo
  function imgUrlForId(id){
    return `https://allofusbhere.github.io/family-tree-images/${id}.jpg`;
  }

  function loadLabel(id){ try{return(JSON.parse(localStorage.getItem('labels')||'{}')[id]||"");}catch(e){return"";} }
  function saveLabel(id,name){ try{const d=JSON.parse(localStorage.getItem('labels')||'{}');d[id]=name;localStorage.setItem('labels',JSON.stringify(d));}catch(e){} }
  function displayName(id){ const n=(loadLabel(id)||"").trim(); return n||id; }
  function longPress(el,ms,onLong){ let t=null; el.addEventListener('pointerdown',ev=>{ev.preventDefault();t=setTimeout(onLong,ms);}); ['pointerup','pointerleave','pointercancel'].forEach(evt=>{el.addEventListener(evt,()=>{if(t){clearTimeout(t);t=null;}});}); }

  // Relationship rules
  function deriveSiblings(idStr){ const base=idStr.split('.')[0]; const len=digits(base); const n=parseInt(base,10); const place=10000; const currentDigit=Math.floor(n/place)%10; const floorToPlace=n-currentDigit*place; const out=[]; for(let k=1;k<=9;k++){const sib=floorToPlace+k*place;if(sib!==n)out.push(padTo(len,sib));} return out; }
  function deriveChildren(idStr){ const base=idStr.split('.')[0]; const len=digits(base); const n=parseInt(base,10); const place=1000; const currentDigit=Math.floor(n/place)%10; const floorToPlace=n-currentDigit*place; const out=[]; for(let k=1;k<=9;k++){out.push(padTo(len,floorToPlace+k*place));} return out; }
  function deriveParents(idStr){ const base=idStr.split('.')[0]; const len=digits(base); const n=parseInt(base,10); const k1000=Math.floor(n/1000)%10; const k10000=Math.floor(n/10000)%10; const parents=new Set(); if(k1000>0){parents.add(padTo(len,n-k1000*1000));} else if(k10000>0){parents.add(padTo(len,n-k10000*10000));} return Array.from(parents); }

  const historyStack=[]; let anchorId=null;
  const anchorCard=$('#anchorCard'); const anchorImg=$('#anchorImg');
  const anchorIdEl=$('#anchorId'); const anchorNameEl=$('#anchorName');
  const grid=$('#grid'); const tileTemplate=$('#tileTemplate');

  function setAnchor(id){ if(anchorId&&anchorId!==id)historyStack.push(anchorId); anchorId=id; anchorIdEl.textContent=id; anchorNameEl.textContent=displayName(id); anchorImg.src=imgUrlForId(id); anchorImg.alt=`ID ${id}`; hideGrid(); }

  function hideGrid(){grid.innerHTML='';grid.classList.add('hidden');}
  function showGrid(ids){ grid.innerHTML=''; grid.classList.remove('hidden'); ids.slice(0,9).forEach(id=>{ const tile=tileTemplate.content.firstElementChild.cloneNode(true); const img=tile.querySelector('img'); const nameSpan=tile.querySelector('.name'); tile.querySelector('.id').textContent=""; nameSpan.textContent=displayName(id); img.src=imgUrlForId(id); img.addEventListener('error',()=>{tile.remove();if(grid.children.length===0)grid.classList.add('hidden');}); tile.addEventListener('click',()=>setAnchor(id)); grid.appendChild(tile); }); }

  // Buttons
  $('#btnSiblings').addEventListener('click',()=>{if(anchorId)showGrid(deriveSiblings(anchorId));});
  $('#btnChildren').addEventListener('click',()=>{if(anchorId)showGrid(deriveChildren(anchorId));});
  $('#btnParents').addEventListener('click',()=>{if(anchorId)showGrid(deriveParents(anchorId));});
  $('#btnBack').addEventListener('click',()=>{if(historyStack.length)setAnchor(historyStack.pop());});

  // Swipe (touch) handling
  (function enableSwipe(){
    let x0=0,y0=0,t0=0;
    const THRESH=30; // px
    anchorCard.addEventListener('touchstart',e=>{
      const t=e.touches[0]; x0=t.clientX; y0=t.clientY; t0=Date.now();
    }, {passive:true});
    anchorCard.addEventListener('touchend',e=>{
      const dt=Date.now()-t0;
      const t=e.changedTouches[0]; const dx=t.clientX-x0; const dy=t.clientY-y0;
      if(Math.max(Math.abs(dx),Math.abs(dy))<THRESH) return;
      if(Math.abs(dx)>Math.abs(dy)){
        // Horizontal — Right reserved for spouse (future), Left = siblings
        if(dx<0){ if(anchorId)showGrid(deriveSiblings(anchorId)); }
      } else {
        // Vertical
        if(dy<0){ if(anchorId)showGrid(deriveParents(anchorId)); }   // Up
        else { if(anchorId)showGrid(deriveChildren(anchorId)); }    // Down
      }
    }, {passive:true});
  })();

  // Long-press to edit name
  longPress(anchorImg,500,()=>{
    if(!anchorId) return;
    const current=(loadLabel(anchorId)||"").trim();
    const name=prompt(`Edit display name for ${anchorId}`, current);
    if(name!==null){ const v=name.trim(); saveLabel(anchorId,v); anchorNameEl.textContent=displayName(anchorId); }
  });

  function boot(){ let id=getHashId()||"100000"; setHashId(id); setAnchor(id); }
  window.addEventListener('popstate',e=>{const id=(e.state&&e.state.id)||getHashId()||anchorId;if(id)setAnchor(id);});
  document.addEventListener('DOMContentLoaded',boot);
})();