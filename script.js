(function(){
  'use strict';
  const BUILD_VER = 'v1.3.1-20250822';
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  document.addEventListener('contextmenu', e => e.preventDefault());

  function getHashId(){ const m=location.hash.match(/id=(\d+(?:\.\d+)?)/); return m?m[1]:null; }
  function setHashId(id){ const url=new URL(location.href); url.hash=`id=${id}`; history.pushState({id},"",url); }
  function digits(nStr){ return nStr.split('.')[0].length; }
  function padTo(len,n){ return n.toString().padStart(len,'0'); }
  function toInt(idStr){ return parseInt(idStr.split('.')[0],10); }

  // Generation helpers (locked)
  function genPlace(idStr){
    const s=idStr.split('.')[0];
    for(let i=0;i<s.length;i++){ if(s[i]!=='0'){ return Math.pow(10, s.length-i-1); } }
    return Math.pow(10, s.length-1);
  }
  function childPlace(idStr){ return genPlace(idStr)/10; }

  // Multi-extension (limited) + cache-busting
  const EXT_LIST = ['.jpg', '.JPG'];
  function imgUrlCandidates(id){
    return EXT_LIST.map(ext => `https://allofusbhere.github.io/family-tree-images/${id}${ext}?v=${BUILD_VER}`);
  }
  function attachMultiSrc(imgEl, id, onAllError){
    const candidates = imgUrlCandidates(id);
    let idx = 0;
    function tryNext(){
      if(idx >= candidates.length){
        imgEl.onerror = null; imgEl.onload = null;
        if(onAllError) onAllError();
        return;
      }
      const url = candidates[idx++];
      imgEl.onerror = tryNext;
      imgEl.onload  = () => { imgEl.onerror = null; imgEl.onload = null; };
      imgEl.src = url;
      imgEl.alt = `ID ${id}`;
    }
    tryNext();
  }

  function loadLabel(id){ try{return(JSON.parse(localStorage.getItem('labels')||'{}')[id]||"");}catch(e){return"";} }
  function saveLabel(id,name){ try{const d=JSON.parse(localStorage.getItem('labels')||'{}');d[id]=name;localStorage.setItem('labels',JSON.stringify(d));}catch(e){} }
  function displayName(id){ const n=(loadLabel(id)||"").trim(); return n||id; }

  // Relationship derivation (locked)
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
  const missingTemplate=$('#missingTemplate');

  function setAnchor(id){
    if(anchorId&&anchorId!==id)historyStack.push(anchorId);
    anchorId=id;
    anchorIdEl.textContent=id;
    anchorNameEl.textContent=displayName(id);
    attachMultiSrc(anchorImg, id);
    hideGrid();
  }
  function hideGrid(){ grid.innerHTML=''; grid.classList.add('hidden'); notice.classList.add('hidden'); notice.textContent=''; }

  // Render helpers
  function appendPersonTile(id){
    const tile=tileTemplate.content.firstElementChild.cloneNode(true);
    const img=tile.querySelector('img'); const nameSpan=tile.querySelector('.name');
    tile.querySelector('.id').textContent="";
    nameSpan.textContent=displayName(id);
    attachMultiSrc(img, id, ()=>{
      // turn into missing placeholder
      const ph=missingTemplate.content.firstElementChild.cloneNode(true);
      ph.querySelector('.id').textContent='';
      ph.querySelector('.name').textContent=displayName(id);
      tile.replaceWith(ph);
    });
    tile.addEventListener('click',()=>setAnchor(id));
    grid.appendChild(tile);
  }

  // Sequential render with two modes:
  // - contiguousMode (Children): stop after first missing *after* at least one success.
  // - earlyStopMode (Parents/Siblings): stop after 2 consecutive misses.
  function renderSet(ids, {contiguousMode=false, earlyStopMode=false}={}){
    grid.innerHTML=''; grid.classList.remove('hidden');
    let successCount=0, consecutiveMiss=0, stopped=false;
    let processed=0;
    const maxTiles=9;

    function next(){
      if(stopped) return;
      if(processed>=ids.length || successCount>=maxTiles) return;
      const id=ids[processed++];
      const tile=tileTemplate.content.firstElementChild.cloneNode(true);
      const img=tile.querySelector('img'); const nameSpan=tile.querySelector('.name');
      tile.querySelector('.id').textContent="";
      nameSpan.textContent=displayName(id);

      function onAllError(){
        consecutiveMiss++;
        if(contiguousMode && successCount>0){
          // stop at first gap after at least one success
          const missId = id;
          // show a single placeholder + notice and stop
          const ph=missingTemplate.content.firstElementChild.cloneNode(true);
          ph.querySelector('.name').textContent=`Image not found (${missId})`;
          grid.appendChild(ph);
          notice.textContent=`Stopped after first missing ID (${missId}).`;
          notice.classList.remove('hidden');
          stopped=true;
          return;
        }
        if(earlyStopMode && consecutiveMiss>=2){
          notice.textContent='Stopping after repeated missing images.';
          notice.classList.remove('hidden');
          stopped=true;
          return;
        }
        // otherwise skip this one and continue
        tile.remove();
        next();
      }

      function onLoad(){
        consecutiveMiss=0; successCount++;
        img.removeEventListener('load', onLoad);
        img.removeEventListener('allerror', onAllError);
        next();
      }

      img.addEventListener('load', onLoad);
      img.addEventListener('allerror', onAllError);
      attachMultiSrc(img, id, ()=>img.dispatchEvent(new Event('allerror')));
      tile.addEventListener('click',()=>setAnchor(id));
      grid.appendChild(tile);
    }

    // pump initial
    for(let k=0;k<Math.min(3, ids.length); k++) next();
  }

  function showSiblings(){ if(!anchorId) return; renderSet(deriveSiblings(anchorId), {earlyStopMode:true}); }
  function showChildren(){ if(!anchorId) return; renderSet(deriveChildren(anchorId), {contiguousMode:true}); }
  function showParents(){ if(!anchorId) return; renderSet(deriveParents(anchorId), {earlyStopMode:true}); }

  // Buttons
  $('#btnSiblings').addEventListener('click', showSiblings);
  $('#btnChildren').addEventListener('click', showChildren);
  $('#btnParents').addEventListener('click', showParents);
  $('#btnBack').addEventListener('click',()=>{if(historyStack.length)setAnchor(historyStack.pop());});

  // Swipe
  (function enableSwipe(){
    let x0=0,y0=0; const THRESH=30;
    anchorCard.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY;},{passive:true});
    anchorCard.addEventListener('touchend',e=>{
      const t=e.changedTouches[0], dx=t.clientX-x0, dy=t.clientY-y0;
      if(Math.max(Math.abs(dx),Math.abs(dy))<THRESH) return;
      if(Math.abs(dx)>Math.abs(dy)){
        if(dx<0){ showSiblings(); }
      } else {
        if(dy<0){ showParents(); }
        else { showChildren(); }
      }
    }, {passive:true});
  })();

  // Long-press to edit
  function longPress(el,ms,onLong){
    let t=null;
    el.addEventListener('pointerdown',ev=>{ev.preventDefault();t=setTimeout(onLong,ms);});
    ['pointerup','pointerleave','pointercancel'].forEach(evt=>{
      el.addEventListener(evt,()=>{if(t){clearTimeout(t);t=null;}});
    });
  }
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