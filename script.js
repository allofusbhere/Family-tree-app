// SwipeTree RC3.5 — fixes: correct parent/sibling math, spouse toggle, modal overlays, no blank tiles
(function(){
  'use strict';
  const byId = id => document.getElementById(id);
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts||false);
  const url = new URL(window.location.href);

  function getSavedBase(){ try { return localStorage.getItem('st_imgBase') || ''; } catch(e){ return ''; } }
  function setSavedBase(v){ try { localStorage.setItem('st_imgBase', v||''); } catch(e){} }

  let IMG_BASE = url.searchParams.get('imgBase') || getSavedBase() || './';

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
    gridEmpty: byId('gridEmpty'),
    startOverlay: byId('startOverlay'),
    startBackdrop: byId('startBackdrop'),
    startClose: byId('startClose'),
    inputId: byId('inputId'),
    inputImgBase: byId('inputImgBase'),
    btnStartGo: byId('btnStartGo'),
    btnQuick100000: byId('btnQuick100000'),
    toast: byId('toast'),
  };

  let anchorId = null;            // may be "300000" or "300000.1"
  const historyStack = [];
  const MAX_PER_GROUP = 9;

  const ID_FULL_RE = /^\d{5,8}(?:\.\d+)?$/;

  function numericBase(idStr){
    const m = String(idStr).match(/^(\d{5,8})(?:\..*)?$/);
    return m ? Number(m[1]) : NaN;
  }

  function imgSrcFor(id){ return `${IMG_BASE}${id}.jpg`; }

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
    ui.placeholderNote && ui.placeholderNote.classList.add('hidden');
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
    ui.anchorImg.src = imgSrcFor(idStr);
    ui.anchorImg.alt = `ID ${idStr}`;
    ui.anchorLabel.textContent = idStr;
    ui.anchorImg.classList.add('highlight');
    setTimeout(()=> ui.anchorImg.classList.remove('highlight'), 250);
  }

  // ===== Relationship Math =====
  function trailingZeros(n){
    const s = String(n); let tz=0;
    for (let i=s.length-1; i>=0 && s[i]==='0'; i--) tz++;
    return tz;
  }
  function parentPlace(n){
    const tz = trailingZeros(n);
    if (tz<=0) return 0;
    return Math.pow(10, tz); // one place to the left of the zero run
  }
  function childStep(n){
    const tz = trailingZeros(n);
    if (tz<=0) return 0;
    return Math.pow(10, tz-1);
  }
  function computeParentId(n){
    const P = parentPlace(n);
    if (!P) return null;
    const digit = Math.floor(n / P) % 10;
    if (digit===0) return null; // base branch
    return n - digit * P;
  }
  function computeChildren(n){
    const step = childStep(n);
    if (!step) return [];
    const out = [];
    for (let k=1;k<=MAX_PER_GROUP;k++) out.push(n + k*step);
    return out;
  }
  function computeSiblings(n){
    const P = parentPlace(n);
    if (!P) return [];
    const digit = Math.floor(n / P) % 10;
    const baseParent = n - digit*P;
    const out = [];
    for (let k=1;k<=MAX_PER_GROUP;k++){ if (k!==digit) out.push(baseParent + k*P); }
    return out;
  }
  function computeSpouses(n){ return [`${n}.1`]; }

  // ===== Image preloading to avoid blanks =====
  function preloadExisting(ids){
    const checks = ids.map(id => new Promise((resolve)=>{
      const img = new Image();
      img.onload = ()=> resolve({id, ok:true});
      img.onerror = ()=> resolve({id, ok:false});
      img.src = imgSrcFor(id);
    }));
    return Promise.all(checks).then(results => results.filter(r=>r.ok).map(r=>r.id));
  }

  function openGrid(title, ids){
    document.body.classList.add('modal-open');
    ui.overlayTitle.textContent = title;
    ui.grid.innerHTML = '';
    ui.gridEmpty.classList.add('hidden');
    ui.gridOverlay.classList.add('show');
    ui.gridOverlay.setAttribute('aria-hidden','false');
    ui.anchorWrap.classList.add('hidden'); // hide anchor while modal

    preloadExisting(ids).then(existing => {
      if (existing.length === 0){
        ui.gridEmpty.classList.remove('hidden');
        return;
      }
      existing.forEach(id => {
        const tile = document.createElement('button');
        tile.className = 'tile';
        const img = document.createElement('img'); img.alt = `ID ${id}`; img.src = imgSrcFor(id);
        const lab = document.createElement('div'); lab.className = 'tlabel'; lab.textContent = id;
        tile.appendChild(img); tile.appendChild(lab);
        on(tile,'click',()=>{ closeOverlay(); go(String(id)); });
        ui.grid.appendChild(tile);
      });
    });
  }

  function closeOverlay(){
    document.body.classList.remove('modal-open');
    ui.gridOverlay.classList.remove('show');
    ui.gridOverlay.setAttribute('aria-hidden','true');
    ui.anchorWrap.classList.remove('hidden');
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
  function requireAnchor(){ if(!anchorId){ showStart(); return false; } return true; }

  function handleRight(){
    if(!requireAnchor()) return;
    const base = numericBase(anchorId);
    // Toggle if currently at spouse .1 and base image exists; else go to spouse if exists; else open grid (which may be empty)
    const isSpouse = /\.\d+$/.test(anchorId);
    const spouseId = `${base}.1`;
    if (isSpouse){
      // toggle back to base
      preloadExisting([String(base)]).then(list => { if (list.length){ go(String(base)); } else { openGrid('Spouse', [spouseId]); }});
    } else {
      preloadExisting([spouseId]).then(list => {
        if (list.length){ go(spouseId); } else { openGrid('Spouse', [spouseId]); }
      });
    }
  }
  function handleLeft(){ if(!requireAnchor()) return openGrid('Siblings', []); const base=numericBase(anchorId); openGrid('Siblings', computeSiblings(base)); }
  function handleDown(){ if(!requireAnchor()) return openGrid('Children', []); const base=numericBase(anchorId); openGrid('Children', computeChildren(base)); }
  function handleUp(){
    if(!requireAnchor()) return;
    const base = numericBase(anchorId);
    const p = computeParentId(base);
    if (p) openGrid('Parents', [p]); else showToast('No parents');
  }

  // ===== Start UI =====
  function showStart(){
    ui.inputImgBase.value = IMG_BASE==='./' ? '' : IMG_BASE;
    ui.startOverlay.classList.add('show');
    ui.startOverlay.setAttribute('aria-hidden','false');
    ui.inputId.focus();
  }
  function hideStart(){
    ui.startOverlay.classList.remove('show');
    ui.startOverlay.setAttribute('aria-hidden','true');
  }
  function doStart(idMaybe){
    const idStr = (idMaybe || ui.inputId.value.trim());
    const base = ui.inputImgBase.value.trim();
    if (base){ const b = base.endsWith('/')? base: base+'/'; IMG_BASE=b; setSavedBase(b); }
    hideStart();
    if (idStr) go(idStr, false);
  }

  function bind(){
    on(ui.startBtn,'click',showStart);
    on(ui.startClose,'click',hideStart);
    on(ui.startBackdrop,'click',hideStart);
    on(ui.overlayClose,'click',closeOverlay);
    on(ui.overlayBackdrop,'click',closeOverlay);
    on(ui.btnStartGo,'click',()=>doStart());
    on(ui.btnQuick100000,'click',()=>doStart('100000'));
    on(ui.backBtn,'click',()=>{
      if(ui.gridOverlay.classList.contains('show')){ closeOverlay(); return; }
      const prev = historyStack.pop(); if (prev) go(prev, false);
    });
    on(document.body,'touchstart',onTouchStart,{passive:true});
    on(document.body,'touchend',onTouchEnd,{passive:true});
    on(window,'keydown',(e)=>{
      if(e.key==='ArrowRight') handleRight();
      else if(e.key==='ArrowLeft') handleLeft();
      else if(e.key==='ArrowDown') handleDown();
      else if(e.key==='ArrowUp') handleUp();
      else if(e.key==='Escape') { if(ui.gridOverlay.classList.contains('show')) closeOverlay(); else hideStart(); }
      else if(e.key==='Enter' && !anchorId) showStart();
    });
    on(ui.anchorImg,'click',()=>{ ui.anchorImg.classList.add('highlight'); setTimeout(()=> ui.anchorImg.classList.remove('highlight'), 220); });

    // Auto-load from query/hash
    const qId = url.searchParams.get('id');
    const hId = parseHashId();
    const firstId = qId || hId;
    if (firstId) go(firstId, false);
  }

  window.addEventListener('DOMContentLoaded', bind);
})();
