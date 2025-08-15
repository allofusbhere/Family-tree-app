
(function(){
  'use strict';
  const BUILD_TAG = (()=>{ const d=new Date(),p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; })();
  const IMAGE_BASE = window.SWIPE_TREE_IMAGE_BASE || '/family-tree-images/';
  const TRY_EXTS = ['.jpg','.JPG','.jpeg','.JPEG','.png','.PNG'];
  const PLACEHOLDER_DATAURL = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1066"><rect width="100%" height="100%" fill="#22252b"/><text x="50%" y="50%" fill="#889" font-family="Arial, sans-serif" font-size="42" text-anchor="middle">Image not found</text></svg>`);

  const imgEl = document.getElementById('anchorImg');
  const captionEl = document.getElementById('anchorCaption');
  const backBtn = document.getElementById('backBtn');
  const startBtn = document.getElementById('startBtn');
  const card = document.getElementById('anchorCard');
  const modal = document.getElementById('modal');
  const nameInput = document.getElementById('nameInput');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const toast = document.getElementById('toast');

  let anchorId = null; const historyStack = [];
  const buildUrl = (id,ext)=> `${IMAGE_BASE}${id}${ext}?v=${BUILD_TAG}`;
  const setCaptionFromStorage = (id)=>{ const name = localStorage.getItem(`name:${id}`); captionEl.textContent = name?.trim() ? name.trim() : 'Anchor person'; };
  function showToast(msg){ toast.textContent = msg; toast.style.display = 'block'; clearTimeout(showToast._t); showToast._t = setTimeout(()=> toast.style.display='none', 1350); }
  function testImage(url){ return new Promise(res=>{ const im=new Image(); im.onload=()=>res(true); im.onerror=()=>res(false); im.src=url; }); }
  async function testAnySource(id){ for(const ext of TRY_EXTS){ const url = buildUrl(id, ext); if (await testImage(url)) return url; } return null; }
  async function resolveImageSrc(id){ const url = await testAnySource(id); return url || PLACEHOLDER_DATAURL; }
  async function setAnchor(newId, pushHistory=true){ if(!newId) return; if(anchorId && pushHistory) historyStack.push(anchorId); backBtn.disabled = historyStack.length===0; anchorId=String(newId); imgEl.src=PLACEHOLDER_DATAURL; setCaptionFromStorage(anchorId); imgEl.src = await resolveImageSrc(anchorId); }

  startBtn.addEventListener('click', ()=>{ const val=prompt('Enter starting ID (e.g., 140000):', anchorId||''); if(val) setAnchor(val.trim(), !!anchorId); });
  backBtn.addEventListener('click', ()=>{ const prev=historyStack.pop(); if(prev) setAnchor(prev,false); backBtn.disabled = historyStack.length===0; });

  // Long-press edit
  let pressTimer=null; const LONG=450;
  function openModal(){ nameInput.value=(localStorage.getItem(`name:${anchorId}`)||'').trim(); modal.classList.remove('hidden'); nameInput.focus(); }
  function closeModal(){ modal.classList.add('hidden'); }
  function saveName(){ const v=nameInput.value.trim(); if(v) localStorage.setItem(`name:${anchorId}`,v); else localStorage.removeItem(`name:${anchorId}`); setCaptionFromStorage(anchorId); closeModal(); }
  function startPress(){ clearTimeout(pressTimer); pressTimer=setTimeout(openModal,LONG); }
  function clearPress(){ clearTimeout(pressTimer); pressTimer=null; }
  card.addEventListener('mousedown', startPress); card.addEventListener('mouseup', clearPress); card.addEventListener('mouseleave', clearPress);
  card.addEventListener('touchstart', ()=>{ startPress(); }, {passive:true}); card.addEventListener('touchmove', ()=>{}, {passive:true}); card.addEventListener('touchend', ()=>{ clearPress(); }, {passive:true});
  saveBtn.addEventListener('click', saveName); cancelBtn.addEventListener('click', closeModal); modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });

  // Relationship math
  function trailingZeros(n){ let s=String(n).split('.')[0], c=0; for(let i=s.length-1;i>=0 && s[i]==='0';i--) c++; return c; }
  function asInt(id){ return parseInt(String(id).split('.')[0], 10); }
  function computeParent(n){ const k=trailingZeros(n); const p1 = 10**(k+1); if(n % p1 !== 0){ return Math.floor(n/p1)*p1; } else { const p2=10**(k+2); return Math.floor(n/p2)*p2; } }
  function computeChildren(n){ const k=trailingZeros(n); const step=10**k; const out=[]; for(let i=1;i<=9;i++) out.push(n + i*step); return out; }
  function computeSiblings(n){ const k=trailingZeros(n); const step=10**(k+1); const higher=Math.floor(n/(10**(k+2)))*(10**(k+2)); const out=[]; for(let i=1;i<=9;i++) out.push(higher + i*step); return out; }

  // Swipe
  let sx=0,sy=0,dx=0,dy=0,tracking=false; const TH=40;
  function onStart(x,y){ tracking=true; sx=x; sy=y; dx=0; dy=0; }
  function onMove(x,y){ if(!tracking) return; dx=x-sx; dy=y-sy; }
  async function onEnd(){
    if(!tracking) return; tracking=false;
    if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>TH){
      if(dx>0){ await toggleSpouse(); } else { await gotoFirstExisting(computeSiblings(asInt(anchorId)),'siblings'); }
    } else if(Math.abs(dy)>TH){
      if(dy<0){ const p=computeParent(asInt(anchorId)); const ok=await testAnySource(String(p)); if(ok){ await setAnchor(String(p),true); showToast('Parent'); } else showToast('Parent not found'); }
      else { await gotoFirstExisting(computeChildren(asInt(anchorId)),'children'); }
    }
  }
  card.addEventListener('touchstart',(e)=>{const t=e.changedTouches[0]; onStart(t.clientX,t.clientY);},{passive:true});
  card.addEventListener('touchmove',(e)=>{const t=e.changedTouches[0]; onMove(t.clientX,t.clientY);},{passive:true});
  card.addEventListener('touchend',()=> onEnd(), {passive:true});
  card.addEventListener('pointerdown',(e)=> onStart(e.clientX,e.clientY));
  window.addEventListener('pointermove',(e)=> onMove(e.clientX,e.clientY));
  window.addEventListener('pointerup', onEnd);

  function isSpouse(id){ return String(id).includes('.1'); }
  async function toggleSpouse(){ const base=String(anchorId).split('.')[0]; const spouseId=`${base}.1`; const url=await testAnySource(spouseId); if(url){ await setAnchor(spouseId,true); showToast('Spouse'); } else showToast('No spouse image found'); }
  async function gotoFirstExisting(cands,label){ for(const id of cands){ const url=await testAnySource(String(id)); if(url){ await setAnchor(String(id),true); showToast(label); return; } } showToast(`No ${label} found`); }

  const last=sessionStorage.getItem('lastAnchorId'); window.addEventListener('beforeunload',()=>{ if(anchorId) sessionStorage.setItem('lastAnchorId',anchorId); });
  (async function boot(){ const start = last || prompt('Enter starting ID (e.g., 140000):','140000') || '140000'; await setAnchor(start,false); })();
})();