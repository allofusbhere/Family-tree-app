
/* SwipeTree — script.js (iPad Swipe Fix + Animations + SoftEdit) */
(function(){
  'use strict';

  // Prevent page scroll/bounce so we can capture vertical swipes
  document.documentElement.style.overflow='hidden';
  document.body.style.overflow='hidden';

  const IMG_BASE=(typeof window!=='undefined'&&window.IMG_BASE)?window.IMG_BASE:'./';
  const EXT=['.jpg','.jpeg','.png','.webp','.JPG','.JPEG','.PNG','.WEBP'];
  const PH_P2='placeholder_parent2.jpg', PH_MISS='placeholder.jpg';

  const $anchor=document.getElementById('anchor');
  const $grid=document.getElementById('grid');
  const $startBtn=document.getElementById('startBtn');

  // Remove legacy "edit" hints if somehow injected
  function purgeHints(root=document){
    const kill=/long-press to edit|edit label/i;
    (root.querySelectorAll('*')||[]).forEach(el=>{ try{ if(el.nodeType===1 && kill.test(el.textContent||'')) el.remove(); }catch{} });
  }
  purgeHints();
  new MutationObserver(m=>m.forEach(x=>x.addedNodes&&x.addedNodes.forEach(n=>{ if(n.nodeType===1) purgeHints(n);})))
    .observe(document.documentElement,{childList:true,subtree:true});

  // Labels
  const getLabels=()=>{ try{return JSON.parse(localStorage.getItem('st_labels')||'{}');}catch{return {};}};
  const setLabels=m=>localStorage.setItem('st_labels',JSON.stringify(m||{}));
  const showName=id=>getLabels()[id]||id;
  function saveName(id,text){ const m=getLabels(); if(text&&text.trim()) m[id]=text.trim(); else delete m[id]; setLabels(m); }

  function showAnchor(show){ if(!$anchor) return; if(show){$anchor.style.display='grid';} else {$anchor.innerHTML=''; $anchor.style.display='none';} }

  let anchorId=null;

  const urls=id=>EXT.map(e=>IMG_BASE+id+e);
  function exists(u){ return new Promise(r=>{ const i=new Image(); i.onload=()=>r(true); i.onerror=()=>r(false); i.src=u+((u.includes('?')?'&':'?')+'cb='+Date.now()); }); }
  async function resolve(id){ for(const u of urls(id)){ if(await exists(u)) return u; } return null; }

  const base=id=>{ const s=String(id); const dot=s.indexOf('.'); return dot===-1?s:s.slice(0,dot); };
  const isSpouse=id=>String(id).includes('.1');

  // Digit helpers
  const to6 = id => String(parseInt(id,10)).padStart(6,'0');
  const digits = id => to6(id).split('').map(x=>parseInt(x,10));
  const fromDigits = d => d.map(n=>String(n)).join('');

  // Level position = LAST non-zero among positions 1..5
  function levelPos(id){
    const d = digits(base(id));
    for(let p=5; p>=1; p--){ if(d[p]!==0) return p; }
    return 1;
  }

  // Parent1: zero thousands; if already zero, zero ten-thousands
  function parent1FromAny(id){
    const n = parseInt(base(id),10);
    const thousands = Math.floor(n/1000)%10;
    if(thousands!==0) return String(n - thousands*1000).padStart(6,'0');
    const tenThousands = Math.floor(n/10000)%10;
    if(tenThousands!==0) return String(n - tenThousands*10000).padStart(6,'0');
    return null;
  }
  async function parent2FromP1(p1){ if(!p1) return null; const g=`${p1}.1`; return (await resolve(g))?g:null; }

  // Siblings: vary the CURRENT level digit (last non-zero), zero lower digits
  async function listSiblings(id){
    const b = base(id);
    const d = digits(b);
    const pos = levelPos(b);
    const out=[];
    const cur = d[pos];
    for(let p=pos+1; p<=5; p++) d[p]=0;
    for(let k=1; k<=9; k++){
      if(k===cur) continue;
      const dd = d.slice(); dd[pos]=k;
      const cand = fromDigits(dd);
      if(await resolve(cand)) out.push(cand);
    }
    return out;
  }

  // Children: next position; enumerate 1..9
  async function listChildren(id){
    const b = base(id);
    const posParent = levelPos(b);
    const posChild = Math.min(posParent+1, 5);
    const d = digits(b);
    for(let p=posChild; p<=5; p++) d[p]=0;
    const out=[];
    for(let k=1; k<=9; k++){
      const dd = d.slice();
      dd[posChild]=k;
      const cand = fromDigits(dd);
      if(await resolve(cand)) out.push(cand);
    }
    return out;
  }

  // Long-press editor (soft edit: available but hidden until long-press)
  let lpTimer=null;
  function longPress(el, fn, ms=650){
    if(!el) return;
    let moved=false;
    el.addEventListener('touchstart', e=>{ moved=false; clearTimeout(lpTimer); lpTimer=setTimeout(()=>{ if(!moved) fn(e); }, ms); }, {passive:false});
    el.addEventListener('touchmove', e=>{ moved=true; clearTimeout(lpTimer); e.preventDefault(); }, {passive:false});
    el.addEventListener('touchend', ()=>{ clearTimeout(lpTimer); }, {passive:false});
    el.addEventListener('mousedown', e=>{ if(e.button!==0) return; moved=false; clearTimeout(lpTimer); lpTimer=setTimeout(()=>{ if(!moved) fn(e); }, ms); });
    ['mousemove','mouseup','mouseleave'].forEach(ev=> el.addEventListener(ev, ()=>{ clearTimeout(lpTimer); }));
  }

  function openEditor(id){
    const overlay=document.createElement('div');
    Object.assign(overlay.style,{position:'fixed',inset:'0',background:'rgba(0,0,0,.6)',display:'grid',placeItems:'center',zIndex:'9999'});
    const panel=document.createElement('div');
    Object.assign(panel.style,{background:'#111',border:'1px solid #333',borderRadius:'12px',padding:'14px',width:'min(420px,92vw)'});
    panel.innerHTML='<div style="font-weight:600;margin-bottom:8px;">Edit label</div>';
    const input=document.createElement('input');
    Object.assign(input,{type:'text',value:(showName(id).match(/^(\d+(\.\d+)*)$/)?'':showName(id))});
    Object.assign(input.style,{width:'100%',padding:'8px',borderRadius:'8px',border:'1px solid #333',background:'#0b0b0b',color:'#eee'});
    const row=document.createElement('div'); Object.assign(row.style,{display:'flex',gap:'8px',marginTop:'10px'});
    const save=document.createElement('button'); save.className='btn'; save.textContent='Save';
    const cancel=document.createElement('button'); cancel.className='btn'; cancel.textContent='Cancel';
    row.appendChild(save); row.appendChild(cancel); panel.appendChild(input); panel.appendChild(row); overlay.appendChild(panel);
    cancel.onclick=()=>document.body.removeChild(overlay);
    save.onclick=()=>{ const v=input.value; saveName(id,v); renderAnchor(id); document.body.removeChild(overlay); };
    document.body.appendChild(overlay); input.focus();
  }

  // Render anchor
  async function renderAnchor(id){
    $anchor.innerHTML='';
    const url=(await resolve(id))||(await resolve(PH_MISS))||'';
    const stage=document.createElement('div');
    stage.className='stage-bg'; stage.setAttribute('role','img'); stage.setAttribute('aria-label', id);
    stage.style.backgroundImage=`url('${url}')`;
    $anchor.appendChild(stage);

    const label=document.createElement('div');
    label.className='label'; label.textContent=showName(id);
    label.style.marginTop='10px'; label.style.fontSize='16px'; label.style.opacity='.9'; label.style.textAlign='center';
    $anchor.appendChild(label);

    longPress(stage, ()=>openEditor(id));
    longPress(label, ()=>openEditor(id));

    if(window.scrollTo) window.scrollTo(0,0);
  }

  async function loadAnchor(id){
    anchorId=id;
    await renderAnchor(id);
    if($grid) $grid.innerHTML='';
    showAnchor(true);
  }

  // Card helpers
  function addCard(parentEl, personId, title, clickable=true){
    const card=document.createElement('div');
    card.className='card'+(clickable?' clickable':'');
    if(title){
      const ttl=document.createElement('div'); ttl.className='title'; ttl.textContent=title; card.appendChild(ttl);
    }
    const imgWrap=document.createElement('div');
    card.appendChild(imgWrap);
    (async()=>{
      const url=(await resolve(personId))||(await resolve(PH_MISS))||'';
      const img=document.createElement('img'); img.src=url; img.alt=personId; img.draggable=false; imgWrap.appendChild(img);
      const l=document.createElement('div'); l.className='label'; l.textContent=showName(personId);
      l.style.marginTop='8px'; l.style.fontSize='14px'; l.style.opacity='.9'; l.style.textAlign='center'; card.appendChild(l);
      if(clickable){ card.addEventListener('click', async()=>{ await loadAnchor(personId); }, {once:true}); }
      longPress(img, ()=>openEditor(personId));
      longPress(l, ()=>openEditor(personId));
    })();
    parentEl.appendChild(card);
  }

  function slideIn(el, dir){
    el.classList.add('slide-wrap');
    if(dir==='left'){ el.classList.add('slide-right'); }
    if(dir==='right'){ el.classList.add('slide-left'); }
    if(dir==='up' || dir==='down'){ /* default vertical slide already set */ }
    requestAnimationFrame(()=>{ el.classList.add('slide-in'); el.classList.remove('slide-left','slide-right'); });
  }

  async function showPeopleGrid(ids, titleText, dir){
    if(!$grid) return;
    $grid.innerHTML='';
    // Subtle anchor fade so it looks like it "moves"
    const st=$anchor.querySelector('.stage-bg'); if(st){ st.classList.add('anchor-hide'); setTimeout(()=>st.classList.remove('anchor-hide'), 300); }
    showAnchor(false);
    const wrapper=document.createElement('div');
    if(titleText){
      const h=document.createElement('div'); h.className='title'; h.textContent=titleText;
      h.style.textAlign='center'; h.style.margin='8px 0 4px'; wrapper.appendChild(h);
    }
    const grid=document.createElement('div'); grid.className='people-grid';
    wrapper.appendChild(grid);
    ids.forEach(id=> addCard(grid, id, '', true));
    $grid.appendChild(wrapper);
    slideIn(wrapper, dir||'up');
  }

  // Gestures (iPad focus) — use move deltas, preventDefault to stop page scroll
  let tActive=false, sx=0, sy=0, lx=0, ly=0, sTime=0;
  function onTouchStart(e){
    if(!e.changedTouches || !e.changedTouches.length) return;
    const t=e.changedTouches[0];
    tActive=true; sx=lx=t.clientX; sy=ly=t.clientY; sTime=Date.now();
  }
  function onTouchMove(e){
    if(!tActive) return;
    if(e.changedTouches && e.changedTouches.length){
      const t=e.changedTouches[0];
      lx=t.clientX; ly=t.clientY;
      e.preventDefault(); // crucial for iOS to avoid scroll
    }
  }
  function onTouchEnd(e){
    if(!tActive) return;
    tActive=false;
    const dx=lx-sx, dy=ly-sy;
    const ax=Math.abs(dx), ay=Math.abs(dy);
    const dt=Date.now()-sTime;
    const MIN=30, MAXT=800;
    if(dt>MAXT) return; // too slow, ignore
    if(ax>ay && ax>MIN){ if(dx>0) swipeRight(); else swipeLeft(); }
    else if(ay>ax && ay>MIN){ if(dy<0) swipeUp(); else swipeDown(); }
  }
  document.addEventListener('touchstart', onTouchStart, {passive:false});
  document.addEventListener('touchmove', onTouchMove, {passive:false});
  document.addEventListener('touchend', onTouchEnd, {passive:false});

  // Actions
  async function swipeRight(){ if(!anchorId) return; if(isSpouse(anchorId)){ await loadAnchor(base(anchorId)); return; } const s=`${anchorId}.1`; if(await resolve(s)) await loadAnchor(s); }
  async function swipeUp(){ if(!$grid||!anchorId) return; $grid.innerHTML=''; showAnchor(false);
    const p1=parent1FromAny(anchorId); const row=document.createElement('div'); row.className='parent-row';
    if(p1){ addCard(row,p1,'Parent #1',true); const p2=await parent2FromP1(p1); if(p2) addCard(row,p2,'Parent #2',true);
      else { const ph=(await resolve(PH_P2))||(await resolve(PH_MISS)); const tmp=ph?'Parent #2 (placeholder)':'Parent #2'; addCard(row,tmp,'Parent #2',false);
        const last=row.lastElementChild; if(last){ const im=last.querySelector('img'); if(im&&ph) im.src=ph; } } }
    else { const m=document.createElement('div'); m.textContent='— no parent #1 —'; m.style.textAlign='center'; m.style.opacity='.8'; row.appendChild(m); }
    $grid.appendChild(row); slideIn(row,'up'); }
  async function swipeLeft(){ if(!anchorId) return; const sibs=await listSiblings(anchorId); await showPeopleGrid(sibs,'Siblings','left'); }
  async function swipeDown(){ if(!anchorId) return; const kids=await listChildren(anchorId); await showPeopleGrid(kids,'Children','down'); }

  // Boot
  async function boot(){
    let id=(location.hash||'').replace('#','').trim(); if(!id) id='100000';
    await loadAnchor(id);
    if($startBtn){ $startBtn.addEventListener('click', ()=>{ const nid=prompt('Enter starting ID:', id)||id; location.hash=nid; location.reload(); }); }
  }
  if(document.readyState==='complete'||document.readyState==='interactive') boot(); else document.addEventListener('DOMContentLoaded', boot);
})(); 
