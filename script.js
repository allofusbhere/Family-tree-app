// SwipeTree — script hotfix (placeholder-safe) 2025-08-19
(function(){
  'use strict';
  const byId = id => document.getElementById(id);
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts||false);
  const url = new URL(window.location.href);

  // Try to read any optional elements; guard all uses
  const ui = {
    startBtn: byId('startBtn'),
    backBtn: byId('backBtn'),
    anchorImg: byId('anchorImg'),
    anchorLabel: byId('anchorLabel'),
    anchorWrap: byId('anchorWrap'),
    placeholderNote: byId('placeholderNote'),      // may be null in rc1.html
    gridOverlay: byId('gridOverlay'),
    overlayTitle: byId('overlayTitle'),
    overlayClose: byId('overlayClose'),
    grid: byId('grid'),
    startOverlay: byId('startOverlay'),            // may be null in rc1.html
    startClose: byId('startClose'),
    inputId: byId('inputId'),
    inputImgBase: byId('inputImgBase'),
    btnStartGo: byId('btnStartGo'),
    btnQuick100000: byId('btnQuick100000'),
    toast: byId('toast') || (function(){ const d=document.createElement('section'); d.id='toast'; d.className='toast hidden'; document.body.appendChild(d); return d; })(),
  };

  function getSavedBase(){ try { return localStorage.getItem('st_imgBase') || ''; } catch(e){ return ''; } }
  function setSavedBase(v){ try { localStorage.setItem('st_imgBase', v||''); } catch(e){} }

  let IMG_BASE = url.searchParams.get('imgBase') || getSavedBase() || './';

  let anchorId = null;            // may be "300000" or "300000.1"
  const historyStack = [];
  const MAX_PER_GROUP = 9;

  const ID_FULL_RE = /^\d{5,8}(?:\.\d+)?$/;

  function imgSrcFor(id){ return `${IMG_BASE}${id}.jpg`; }

  function showToast(msg, ms=1500){
    ui.toast.textContent = msg;
    ui.toast.classList.remove('hidden');
    clearTimeout(ui.toast._t);
    ui.toast._t = setTimeout(()=> ui.toast.classList.add('hidden'), ms);
  }

  function parseHashId(){ const m = location.hash.match(/id=([\d.]+)/); return m ? m[1] : null; }
  function setHashId(id){ const newHash = id ? `#id=${id}` : ''; history.pushState({id}, '', newHash); }

  function revealAnchor(){
    if (ui.placeholderNote) ui.placeholderNote.classList.add('hidden');
    if (ui.anchorImg) ui.anchorImg.classList.remove('hidden');
    if (ui.anchorLabel) ui.anchorLabel.classList.remove('hidden');
    if (ui.anchorWrap) ui.anchorWrap.classList.remove('placeholder');
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
    if (ui.anchorImg){
      ui.anchorImg.src = imgSrcFor(idStr);
      ui.anchorImg.alt = `ID ${idStr}`;
      ui.anchorImg.classList.add('highlight');
      setTimeout(()=> ui.anchorImg.classList.remove('highlight'), 300);
    }
    if (ui.anchorLabel) ui.anchorLabel.textContent = idStr;
  }

  // ===== Relationship Math using base numeric =====
  function numericBase(idStr){ const m = String(idStr).match(/^(\d{5,8})(?:\..*)?$/); return m ? Number(m[1]) : NaN; }
  function trailingZeros(n){ const s=String(n); let tz=0; for(let i=s.length-1;i>=0 && s[i]==='0';i--) tz++; return tz; }
  function placeValueForChildren(n){ const tz=trailingZeros(n); if (tz<=0) return 0; return Math.pow(10, tz-1); }
  function computeParentId(n){ const p=placeValueForChildren(n); if(p===0) return null; const digit=Math.floor(n/p)%10; if(digit===0) return null; return n - digit*p; }
  function computeChildren(n){ const p=placeValueForChildren(n); if(!p) return []; const base=n; const out=[]; for(let k=1;k<=MAX_PER_GROUP;k++) out.push(base + k*p); return out; }
  function computeSiblings(n){ const p=placeValueForChildren(n); if(!p) return []; const digit=Math.floor(n/p)%10; const parent=n - digit*p; const out=[]; for(let k=1;k<=MAX_PER_GROUP;k++){ if(k!==digit) out.push(parent + k*p);} return out; }
  function computeSpouses(n){ return [`${n}.1`]; }

  // ===== Overlay helpers (no-ops if overlay dom absent) =====
  function openGrid(title, ids){
    if (!ui.gridOverlay || !ui.grid || !ui.overlayTitle){ showToast('Overlay unavailable in this page'); return; }
    ui.overlayTitle.textContent = title;
    ui.grid.innerHTML='';
    ids.forEach(id => {
      const tile=document.createElement('button'); tile.className='tile';
      const img=document.createElement('img'); img.alt=`ID ${id}`; img.src=imgSrcFor(id);
      const lab=document.createElement('div'); lab.className='tlabel'; lab.textContent=id;
      tile.appendChild(img); tile.appendChild(lab);
      on(tile,'click',()=>{ closeOverlay(); go(String(id)); });
      ui.grid.appendChild(tile);
    });
    ui.gridOverlay.classList.remove('hidden');
    ui.gridOverlay.setAttribute('aria-hidden','false');
  }
  function closeOverlay(){
    if (!ui.gridOverlay) return;
    ui.gridOverlay.classList.add('hidden');
    ui.gridOverlay.setAttribute('aria-hidden','true');
  }

  // ===== Gestures =====
  let touchStart=null; const SWIPE_MIN=28;
  function onTouchStart(e){ const t=e.touches[0]; touchStart={x:t.clientX,y:t.clientY}; }
  function onTouchEnd(e){
    if(!touchStart) return;
    const t=e.changedTouches[0]; const dx=t.clientX-touchStart.x; const dy=t.clientY-touchStart.y;
    const ax=Math.abs(dx), ay=Math.abs(dy);
    if(ax<SWIPE_MIN && ay<SWIPE_MIN) return;
    if(ax>ay){ if(dx>0) handleRight(); else handleLeft(); }
    else { if(dy>0) handleDown(); else handleUp(); }
    touchStart=null;
  }
  function requireAnchor(){ if(!anchorId){ showToast('Tap Start'); return false; } return true; }
  function handleRight(){ if(!requireAnchor()) return; openGrid('Spouse', computeSpouses(numericBase(anchorId))); }
  function handleLeft(){ if(!requireAnchor()) return; openGrid('Siblings', computeSiblings(numericBase(anchorId))); }
  function handleDown(){ if(!requireAnchor()) return; openGrid('Children', computeChildren(numericBase(anchorId))); }
  function handleUp(){ if(!requireAnchor()) return; const p=computeParentId(numericBase(anchorId)); if(p) openGrid('Parents',[p]); else showToast('No parents'); }

  // ===== Start UI guards =====
  function showStart(){
    if (!ui.startOverlay){ showToast('Enter ID via URL or hash'); return; }
    if (ui.inputImgBase) ui.inputImgBase.value = IMG_BASE==='./' ? '' : IMG_BASE;
    ui.startOverlay.classList.remove('hidden');
    ui.startOverlay.setAttribute('aria-hidden','false');
    ui.inputId && ui.inputId.focus();
  }
  function hideStart(){ if (!ui.startOverlay) return; ui.startOverlay.classList.add('hidden'); ui.startOverlay.setAttribute('aria-hidden','true'); }
  function doStart(idMaybe){
    const idStr = (idMaybe || (ui.inputId && ui.inputId.value.trim()) || '');
    const base = (ui.inputImgBase && ui.inputImgBase.value.trim()) || '';
    if (base){ const b = base.endsWith('/')? base: base+'/'; IMG_BASE=b; setSavedBase(b); }
    hideStart();
    if (idStr) go(idStr, false);
  }

  function bind(){
    on(ui.startBtn,'click',showStart);
    on(ui.startClose,'click',hideStart);
    on(ui.btnStartGo,'click',()=>doStart());
    on(ui.btnQuick100000,'click',()=>doStart('100000'));
    on(ui.backBtn,'click',()=>{
      if(ui.gridOverlay && !ui.gridOverlay.classList.contains('hidden')){ closeOverlay(); return; }
      const prev=historyStack.pop(); if(prev) go(prev,false);
    });
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
    on(ui.anchorImg,'click',()=>{
      ui.anchorImg.classList.add('highlight');
      setTimeout(()=> ui.anchorImg.classList.remove('highlight'), 250);
    });

    const qId = url.searchParams.get('id');
    const hId = parseHashId();
    const firstId = qId || hId;
    if (firstId) go(firstId, false);
  }

  window.addEventListener('DOMContentLoaded', bind);
})();
