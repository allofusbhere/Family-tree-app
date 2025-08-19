// SwipeTree RC Fixed — robust start overlay default visible, handlers attached
(function(){
  'use strict';
  const byId = id => document.getElementById(id);
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts||false);
  const url = new URL(window.location.href);

  // Persist imgBase
  const getBase = () => { try { return localStorage.getItem('st_imgBase') || ''; } catch(e){ return ''; } };
  const setBase = (v) => { try { localStorage.setItem('st_imgBase', v||''); } catch(e){} };
  let IMG_BASE = url.searchParams.get('imgBase') || getBase() || './';

  // UI refs
  const ui = {
    startBtn: byId('startBtn'),
    backBtn: byId('backBtn'),
    anchorImg: byId('anchorImg'),
    anchorLabel: byId('anchorLabel'),
    anchorWrap: byId('anchorWrap'),
    placeholderNote: byId('placeholderNote'),
    gridOverlay: byId('gridOverlay'),
    overlayBackdrop: byId('overlayBackdrop'),
    overlayTitle: byId('overlayTitle'),
    overlayClose: byId('overlayClose'),
    grid: byId('grid'),
    emptyMsg: byId('emptyMsg'),
    startOverlay: byId('startOverlay'),
    startBackdrop: byId('startBackdrop'),
    startClose: byId('startClose'),
    inputId: byId('inputId'),
    inputImgBase: byId('inputImgBase'),
    btnStartGo: byId('btnStartGo'),
    btnQuick100000: byId('btnQuick100000'),
    toast: byId('toast'),
  };

  // State
  let anchorId = null;           // e.g., "140000" or "140000.1"
  const historyStack = [];
  const MAX_PER_GROUP = 9;
  const ID_FULL_RE = /^\d{5,8}(?:\.\d+)?$/;

  const imgUrl = (id, upper=false) => `${IMG_BASE}${id}.${upper?'JPG':'jpg'}`;

  function showToast(msg, ms=1500){
    ui.toast.textContent = msg;
    ui.toast.classList.remove('hidden');
    clearTimeout(ui.toast._t);
    ui.toast._t = setTimeout(()=> ui.toast.classList.add('hidden'), ms);
  }

  function parseHashId(){
    const m = location.hash.match(/id=([\d.]+)/);
    return m ? m[1] : null;
  }
  function setHashId(id){
    const newHash = id ? `#id=${id}` : '';
    history.pushState({id}, '', newHash);
  }

  function revealAnchor(){
    ui.placeholderNote?.classList.add('hidden');
    ui.anchorImg.classList.remove('hidden');
    ui.anchorLabel.classList.remove('hidden');
    ui.anchorWrap.classList.remove('placeholder');
  }

  function go(idStr, pushHistory=true){
    idStr = String(idStr).trim();
    if (!ID_FULL_RE.test(idStr)) { showToast('Use 5–8 digits, optional .suffix'); return; }
    if (pushHistory && anchorId) historyStack.push(anchorId);
    anchorId = idStr;
    setHashId(idStr);
    revealAnchor();
    renderAnchor(idStr);
  }

  function renderAnchor(idStr){
    ui.anchorImg.onerror = () => { ui.anchorImg.src = imgUrl(idStr, true); };
    ui.anchorImg.src = imgUrl(idStr, false);
    ui.anchorImg.alt = `ID ${idStr}`;
    ui.anchorLabel.textContent = idStr;
    ui.anchorImg.classList.add('highlight');
    setTimeout(()=> ui.anchorImg.classList.remove('highlight'), 200);
  }

  // Relationship helpers
  function numericBase(idStr){ const m=String(idStr).match(/^(\d{5,8})(?:\..*)?$/); return m?Number(m[1]):NaN; }
  function trailingZeros(n){ const s=String(n); let tz=0; for(let i=s.length-1;i>=0 && s[i]==='0';i--) tz++; return tz; }
  function parentPlace(n){ const tz=trailingZeros(n); return tz>0 ? Math.pow(10, tz) : 0; }
  function childStep(n){ const tz=trailingZeros(n); return tz>0 ? Math.pow(10, tz-1) : 0; }
  function computeParentId(n){ const P=parentPlace(n); if(!P) return null; const d=Math.floor(n/P)%10; if(d===0) return null; return n - d*P; }
  function computeSiblings(n){ const P=parentPlace(n); if(!P) return []; const d=Math.floor(n/P)%10; const parent=n - d*P; const out=[]; for(let k=1;k<=MAX_PER_GROUP;k++){ if(k!==d) out.push(parent+k*P);} return out; }
  function computeChildren(n){ const S=childStep(n); if(!S) return []; const out=[]; for(let k=1;k<=MAX_PER_GROUP;k++) out.push(n + k*S); return out; }

  // Overlay control
  function openOverlay(){ ui.gridOverlay.classList.remove('hidden'); ui.gridOverlay.setAttribute('aria-hidden','false'); ui.anchorWrap.style.visibility='hidden'; }
  function closeOverlay(){ ui.gridOverlay.classList.add('hidden'); ui.gridOverlay.setAttribute('aria-hidden','true'); ui.anchorWrap.style.visibility='visible'; }

  // Grid builder (no blank tiles)
  function loadIfExists(id){
    return new Promise((resolve)=>{
      const t1=new Image();
      t1.onload=()=>resolve(id); t1.onerror=()=>{
        const t2=new Image();
        t2.onload=()=>resolve(id); t2.onerror=()=>resolve(null);
        t2.src=imgUrl(id,true);
      };
      t1.src=imgUrl(id,false);
    });
  }
  async function openGrid(title, ids){
    ui.overlayTitle.textContent=title;
    ui.grid.innerHTML=''; ui.emptyMsg.classList.add('hidden');
    openOverlay();
    const present=(await Promise.all(ids.map(loadIfExists))).filter(Boolean);
    if(!present.length){ ui.emptyMsg.classList.remove('hidden'); return; }
    present.forEach(id=>{
      const tile=document.createElement('button'); tile.className='tile';
      const img=document.createElement('img'); img.onerror=()=>img.src=imgUrl(id,true); img.src=imgUrl(id,false);
      const lab=document.createElement('div'); lab.className='tlabel'; lab.textContent=id;
      tile.appendChild(img); tile.appendChild(lab);
      on(tile,'click',()=>{ closeOverlay(); go(String(id)); });
      ui.grid.appendChild(tile);
    });
  }

  // Gestures
  let tStart=null; const SWIPE_MIN=28;
  function onTouchStart(e){ const t=e.changedTouches[0]; tStart={x:t.clientX,y:t.clientY}; }
  function onTouchEnd(e){
    if(!tStart) return;
    const t=e.changedTouches[0]; const dx=t.clientX-tStart.x; const dy=t.clientY-tStart.y;
    const ax=Math.abs(dx), ay=Math.abs(dy);
    if(ax<SWIPE_MIN && ay<SWIPE_MIN) return;
    if(ax>ay){ if(dx>0) handleRight(); else handleLeft(); } else { if(dy>0) handleDown(); else handleUp(); }
    tStart=null;
  }

  function requireAnchor(){ if(!anchorId){ showStart(); return false; } return true; }

  async function handleRight(){
    if(!requireAnchor()) return;
    const base=numericBase(anchorId); const spouseId=`${base}.1`;
    // Toggle regardless of existence; we fallback on uppercase extension
    if(String(anchorId)===spouseId){ go(String(base)); } else { go(spouseId); }
  }
  function handleLeft(){ if(!requireAnchor()) return; const base=numericBase(anchorId); openGrid('Siblings', computeSiblings(base)); }
  function handleDown(){ if(!requireAnchor()) return; const base=numericBase(anchorId); openGrid('Children', computeChildren(base)); }
  function handleUp(){ if(!requireAnchor()) return; const base=numericBase(anchorId); const p=computeParentId(base); if(p) openGrid('Parents',[p]); else showToast('No parents'); }

  // Start UI
  function showStart(){
    ui.inputImgBase.value = (IMG_BASE==='./') ? '' : IMG_BASE;
    ui.startOverlay.classList.remove('hidden');
    ui.startOverlay.setAttribute('aria-hidden','false');
    ui.inputId.focus();
  }
  function hideStart(){
    ui.startOverlay.classList.add('hidden');
    ui.startOverlay.setAttribute('aria-hidden','true');
  }
  function doStart(idMaybe){
    const idStr = (idMaybe || ui.inputId.value.trim());
    const base = ui.inputImgBase.value.trim();
    if (base){ IMG_BASE = base.endsWith('/')? base: base+'/'; setBase(IMG_BASE); }
    hideStart();
    if (idStr) go(idStr, false);
  }

  // Binds
  function bind(){
    on(ui.startBtn,'click',showStart);
    on(ui.startClose,'click',hideStart);
    on(ui.startBackdrop,'click',hideStart);
    on(ui.btnStartGo,'click',()=>doStart());
    on(ui.btnQuick100000,'click',()=>doStart('100000'));

    on(ui.overlayClose,'click',closeOverlay);
    on(ui.overlayBackdrop,'click',closeOverlay);

    on(ui.backBtn,'click',()=>{ if(!ui.gridOverlay.classList.contains('hidden')){ closeOverlay(); return; } const prev=historyStack.pop(); if(prev) go(prev,false); });

    on(document.body,'touchstart',onTouchStart,{passive:true});
    on(document.body,'touchend',onTouchEnd,{passive:true});
    on(window,'keydown',(e)=>{
      if(e.key==='ArrowRight') handleRight();
      else if(e.key==='ArrowLeft') handleLeft();
      else if(e.key==='ArrowDown') handleDown();
      else if(e.key==='ArrowUp') handleUp();
      else if(e.key==='Escape') closeOverlay();
      else if(e.key==='Enter' && !anchorId) showStart();
    });

    on(ui.anchorImg,'click',()=>{ ui.anchorImg.classList.add('highlight'); setTimeout(()=> ui.anchorImg.classList.remove('highlight'), 200); });

    // Ensure overlay is visible at boot (so user can click)
    ui.startOverlay.classList.remove('hidden');
    ui.startOverlay.setAttribute('aria-hidden','false');

    // Boot via URL if provided
    const qId=url.searchParams.get('id'); const hId=parseHashId(); const first=qId||hId;
    if(first){ hideStart(); go(first,false); }
  }

  window.addEventListener('DOMContentLoaded', bind);
})();
