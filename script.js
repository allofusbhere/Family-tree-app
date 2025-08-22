(function(){
  'use strict';
  const BUILD_VER = 'v1.2-20250822';
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  document.addEventListener('contextmenu', e => e.preventDefault());

  function getHashId(){ const m=location.hash.match(/id=(\d+(?:\.\d+)?)/); return m?m[1]:null; }
  function setHashId(id){ const url=new URL(location.href); url.hash=`id=${id}`; history.pushState({id},"",url); }
  function digits(nStr){ return nStr.split('.')[0].length; }
  function padTo(len,n){ return n.toString().padStart(len,'0'); }
  function toInt(idStr){ return parseInt(idStr.split('.')[0],10); }

  // Generation helpers
  function genPlace(idStr){
    const s=idStr.split('.')[0];
    for(let i=0;i<s.length;i++){ if(s[i]!=='0'){ return Math.pow(10, s.length-i-1); } }
    return Math.pow(10, s.length-1);
  }
  function childPlace(idStr){ return genPlace(idStr)/10; }

  // Cross-repo image candidates (multi-extension) + cache-busting
  const EXT_LIST = ['.jpg', '.JPG', '.jpeg', '.JPEG', '.png', '.webp'];
  function imgUrlCandidates(id){
    return EXT_LIST.map(ext => `https://allofusbhere.github.io/family-tree-images/${id}${ext}?v=${BUILD_VER}`);
  }

  // Attach to an <img>: try all candidate URLs until one loads, then freeze on success
  function attachMultiSrc(imgEl, id){
    const candidates = imgUrlCandidates(id);
    let idx = 0;
    function tryNext(){
      if(idx >= candidates.length){
        imgEl.dispatchEvent(new Event('allerror'));
        return;
      }
      const url = candidates[idx++];
      imgEl.onerror = tryNext;
      imgEl.onload = () => { imgEl.onerror = null; imgEl.onload = null; };
      imgEl.src = url;
      imgEl.alt = `ID ${id}`;
    }
    tryNext();
  }

  function loadLabel(id){ try{return(JSON.parse(localStorage.getItem('labels')||'{}')[id]||"");}catch(e){return"";} }
  function saveLabel(id,name){ try{const d=JSON.parse(localStorage.getItem('labels')||'{}');d[id]=name;localStorage.setItem('labels',JSON.stringify(d));}catch(e){} }
  function displayName(id){ const n=(loadLabel(id)||"").trim(); return n||id; }
  function longPress(el,ms,onLong){ let t=null; el.addEventListener('pointerdown',ev=>{ev.preventDefault();t=setTimeout(onLong,ms);}); ['pointerup','pointerleave','pointercancel'].forEach(evt=>{el.addEventListener(evt,()=>{if(t){clearTimeout(t);t=null;}});}); }

  // Generation-aware relationships
  function deriveSiblings(idStr){
    const base=idStr.split('.')[0], len=digits(base), n=toInt(base);
    const place=genPlace(base), currentDigit=Math.floor(n/place)%10, floorToPlace=n-currentDigit*place;
    const out=[]; for(let k=1;k<=9;k++){const sib=floorToPlace+k*place; if(sib!==n) out.push(padTo(len,sib));}
    return out;
  }
  function deriveChildren(idStr){
    const base=idStr.split('.')[0], len=digits(base), n=toInt(base);
    const place=childPlace(base), currentDigit=Math.floor(n/place)%10, floorToPlace=n-currentDigit*place;
    const out=[]; for(let k=1;k<=9;k++){ out.push(padTo(len, floorToPlace + k*place)); }
    return out;
  }
  function deriveParents(idStr){
    const base=idStr.split('.')[0], len=digits(base), n=toInt(base);
    const cPlace=childPlace(base), cDigit=Math.floor(n/cPlace)%10;
    const set=new Set();
    if(cDigit>0){ set.add(padTo(len, n - cDigit*cPlace)); }
    else { const gPlace=genPlace(base), gDigit=Math.floor(n/gPlace)%10; if(gDigit>0) set.add(padTo(len, n - gDigit*gPlace)); }
    return Array.from(set);
  }

  const historyStack=[]; let anchorId=null;
  const anchorCard=$('#anchorCard'), anchorImg=$('#anchorImg');
  const anchorIdEl=$('#anchorId'), anchorNameEl=$('#anchorName');
  const grid=$('#grid'), tileTemplate=$('#tileTemplate'), notice=$('#notice');

  function setAnchor(id){
    if(anchorId&&anchorId!==id)historyStack.push(anchorId);
    anchorId=id;
    anchorIdEl.textContent=id;
    anchorNameEl.textContent=displayName(id);
    // Multi-extension loader for anchor
    attachMultiSrc(anchorImg, id);
    hideGrid();
  }

  function hideGrid(){ grid.innerHTML=''; grid.classList.add('hidden'); notice.classList.add('hidden'); notice.textContent=''; }

  function showGrid(ids){
    grid.innerHTML=''; grid.classList.remove('hidden'); let rendered=0;
    ids.slice(0,9).forEach(id=>{
      const tile=tileTemplate.content.firstElementChild.cloneNode(true);
      const img=tile.querySelector('img');
      const nameSpan=tile.querySelector('.name');
      tile.querySelector('.id').textContent="";
      nameSpan.textContent=displayName(id);

      // Multi-extension with "allerror" handler
      img.addEventListener('allerror', ()=>{
        tile.remove();
        if(grid.children.length===0){
          grid.classList.add('hidden');
          notice.textContent = 'No images found for this set.';
          notice.classList.remove('hidden');
        }
      });
      attachMultiSrc(img, id);

      tile.addEventListener('click',()=>setAnchor(id));
      grid.appendChild(tile);
      rendered++;
    });
  }

  // Buttons
  $('#btnSiblings').addEventListener('click',()=>{if(anchorId)showGrid(deriveSiblings(anchorId));});
  $('#btnChildren').addEventListener('click',()=>{if(anchorId)showGrid(deriveChildren(anchorId));});
  $('#btnParents').addEventListener('click',()=>{if(anchorId)showGrid(deriveParents(anchorId));});
  $('#btnBack').addEventListener('click',()=>{if(historyStack.length)setAnchor(historyStack.pop());});

  // Swipe
  (function enableSwipe(){
    let x0=0,y0=0; const THRESH=30;
    anchorCard.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY;},{passive:true});
    anchorCard.addEventListener('touchend',e=>{
      const t=e.changedTouches[0], dx=t.clientX-x0, dy=t.clientY-y0;
      if(Math.max(Math.abs(dx),Math.abs(dy))<THRESH) return;
      if(Math.abs(dx)>Math.abs(dy)){
        if(dx<0){ if(anchorId)showGrid(deriveSiblings(anchorId)); }
      } else {
        if(dy<0){ if(anchorId)showGrid(deriveParents(anchorId)); }
        else { if(anchorId)showGrid(deriveChildren(anchorId)); }
      }
    }, {passive:true});
  })();

  // Long-press to edit
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