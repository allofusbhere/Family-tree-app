
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
  const overlay = document.getElementById('overlay');
  const closeOverlayBtn = document.getElementById('closeOverlay');
  const panelTitle = document.getElementById('panelTitle');
  const resultsGrid = document.getElementById('resultsGrid');

  let anchorId = null; const historyStack = [];

  const buildUrl = (id,ext)=> `${IMAGE_BASE}${id}${ext}?v=${BUILD_TAG}`;
  const setCaptionFromStorage = (id)=>{ const name = localStorage.getItem(`name:${id}`); captionEl.textContent = name?.trim() ? name.trim() : 'Anchor person'; };
  function showToast(msg){ toast.textContent = msg; toast.style.display = 'block'; clearTimeout(showToast._t); showToast._t = setTimeout(()=> toast.style.display='none', 1200); }
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
  function trailingZeros(n){ let s=String(n).split('.')[0]; let c=0; for(let i=s.length-1;i>=0 && s[i]==='0';i--) c++; return c; }
  function asInt(id){ return parseInt(String(id).split('.')[0],10); }
  function computeParent(n){ const k = trailingZeros(n); const p = 10**(k+1); return Math.floor(n / p) * p; }
  function computeChildren(n){ const k = trailingZeros(n); if (k <= 0) return []; const step = 10**(k-1); const out=[]; for(let i=1;i<=9;i++) out.push(n + i*step); return out; }
  function computeSiblings(n){ const k = trailingZeros(n); const step = 10**k; const base = Math.floor(n / (10**(k+1))) * (10**(k+1)); const out=[]; for(let i=1;i<=9;i++) out.push(base + i*step); return out; }

  // Swipe detection via angle
  let sx=0, sy=0, dx=0, dy=0, tracking=false;
  const TH = 40; // min distance
  function onStart(x,y){ tracking=true; sx=x; sy=y; dx=0; dy=0; }
  function onMove(x,y){ if(!tracking) return; dx=x-sx; dy=y-sy; }
  async function onEnd(){
    if(!tracking) return; tracking=false;
    const dist = Math.hypot(dx,dy);
    if (dist < TH) return;
    const angle = Math.atan2(dy, dx) * 180/Math.PI; // -180..180
    if (angle > -30 && angle < 30){ // right
      await toggleSpouseBothWays();
      return;
    }
    if (angle > 150 || angle < -150){ // left
      await showGrid('Siblings', computeSiblings(asInt(anchorId)), true);
      return;
    }
    if (angle <= -60 && angle >= -120){ // up
      const p = computeParent(asInt(anchorId)); const ok = await testAnySource(String(p));
      if (ok){ await setAnchor(String(p), true); showToast('Parent'); } else { showToast('Parent not found'); }
      return;
    }
    if (angle >= 60 && angle <= 120){ // down
      await showGrid('Children', computeChildren(asInt(anchorId)), false);
      return;
    }
  }
  card.addEventListener('touchstart',(e)=>{ const t=e.changedTouches[0]; onStart(t.clientX,t.clientY); },{passive:true});
  card.addEventListener('touchmove',(e)=>{ const t=e.changedTouches[0]; onMove(t.clientX,t.clientY); },{passive:true});
  card.addEventListener('touchend',()=> onEnd(), {passive:true});
  card.addEventListener('pointerdown',(e)=> onStart(e.clientX,e.clientY));
  window.addEventListener('pointermove',(e)=> onMove(e.clientX,e.clientY));
  window.addEventListener('pointerup', onEnd);

  // Spouse toggle both ways
  async function toggleSpouseBothWays(){
    const parts = String(anchorId).split('.');
    const base = parts[0];
    const onSpouse = (parts.length > 1 && parts[1] === '1');
    if (onSpouse){
      const url = await testAnySource(base);
      if (url){ await setAnchor(base, true); showToast('Spouse'); }
      else showToast('Base image not found');
      return;
    }
    const spouseId = `${base}.1`;
    const url = await testAnySource(spouseId);
    if (url){ await setAnchor(spouseId, true); showToast('Spouse'); }
    else showToast('No spouse image found');
  }

  async function showGrid(title, candidates, excludeSelf){
    const uniq=[]; const seen=new Set(); const me = String(asInt(anchorId));
    for(const id of candidates){
      const s=String(id);
      if(excludeSelf && s===me) continue;
      if(!seen.has(s)){ seen.add(s); uniq.push(s); }
    }
    const checks = await Promise.all(uniq.map(id=> testAnySource(id)));
    const found = uniq.map((id,i)=>({id, url:checks[i]})).filter(x=>!!x.url);
    if(!found.length){ showToast(`No ${title.toLowerCase()} found`); return; }
    panelTitle.textContent = title; document.getElementById('resultsGrid').innerHTML='';
    for(const {id,url} of found){
      const div=document.createElement('div'); div.className='thumb';
      const img=document.createElement('img'); img.src=url;
      const cap=document.createElement('div'); cap.className='cap'; cap.textContent=(localStorage.getItem(`name:${id}`)||id);
      div.appendChild(img); div.appendChild(cap);
      div.addEventListener('click', async ()=>{ overlay.classList.remove('show'); await setAnchor(id,true); });
      document.getElementById('resultsGrid').appendChild(div);
    }
    overlay.classList.add('show');
  }
  document.getElementById('closeOverlay').addEventListener('click', ()=> overlay.classList.remove('show'));
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.classList.remove('show'); });

  const last=sessionStorage.getItem('lastAnchorId');
  window.addEventListener('beforeunload', ()=>{ if(anchorId) sessionStorage.setItem('lastAnchorId', anchorId); });
  (async function boot(){ const start = last || prompt('Enter starting ID (e.g., 140000):','140000') || '140000'; await setAnchor(start,false); })();
})();