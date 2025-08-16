
/* SwipeTree — script.js (Siblings + Children + SoftEdit + Shield) */
(function(){
  'use strict';

  document.documentElement.style.overflow='hidden';
  document.body.style.overflow='hidden';

  const IMG_BASE=(typeof window!=='undefined'&&window.IMG_BASE)?window.IMG_BASE:'./';
  const EXT=['.jpg','.jpeg','.png','.webp'];
  const PH_P2='placeholder_parent2.jpg', PH_MISS='placeholder.jpg';

  const $anchor=document.getElementById('anchor');
  const $grid=document.getElementById('grid');
  const $startBtn=document.getElementById('startBtn');

  // ------- Anti-hint shield (remove legacy "long-press"/editor blocks) -------
  function purgeHints(root=document){
    const kill=/long-press to edit|edit label/i;
    (root.querySelectorAll('*')||[]).forEach(el=>{
      try{
        if(el.nodeType!==1) return;
        if(kill.test(el.textContent||'')) el.remove();
      }catch{}
    });
  }
  purgeHints();
  const mo=new MutationObserver(m=>m.forEach(x=>x.addedNodes&&x.addedNodes.forEach(n=>{ if(n.nodeType===1) purgeHints(n);})));
  mo.observe(document.documentElement,{childList:true,subtree:true});

  // ------- Labels (local storage) -------
  const getLabels=()=>{ try{return JSON.parse(localStorage.getItem('st_labels')||'{}');}catch{return {};}};
  const setLabels=m=>localStorage.setItem('st_labels',JSON.stringify(m||{}));
  const showName=id=>getLabels()[id]||id;
  function saveName(id,text){ const m=getLabels(); if(text&&text.trim()) m[id]=text.trim(); else delete m[id]; setLabels(m); }

  function showAnchor(show){ if(!$anchor) return; if(show){$anchor.style.display='grid';} else {$anchor.innerHTML=''; $anchor.style.display='none';} }

  let anchorId=null;

  const urls=id=>EXT.map(e=>IMG_BASE+id+e);
  function exists(u){ return new Promise(r=>{ const i=new Image(); i.onload=()=>r(true); i.onerror=()=>r(false); i.src=u+((u.includes('?')?'&':'?')+'cb='+Date.now()); }); }
  async function resolve(id){ for(const u of urls(id)){ if(await exists(u)) return u; } return null; }

  const digits = id => String(parseInt(id,10)).padStart(6,'0').split('').map(x=>parseInt(x,10));
  const fromDigits = d => d.map(n=>String(n)).join('').padStart(6,'0');
  const base=id=>{ const s=String(id); const dot=s.indexOf('.'); return dot===-1?s:s.slice(0,dot); };
  const isSpouse=id=>String(id).includes('.1');

  // Determine which position is this person's "index" digit (for siblings).
  // Positions: [0]=100000s, [1]=10000s, [2]=1000s, [3]=100s, [4]=10s, [5]=1s
  function currentIndexPos(id){
    const d = digits(base(id));
    for(let p=1; p<6; p++){ // skip [0]; family root at [0]
      if(d[p]!==0){
        // first non-zero among variable positions is the person's index level
        return p;
      }
    }
    return 1; // default to ten-thousands if none set (e.g., 100000)
  }

  function childrenIndexPos(id){
    const p = currentIndexPos(id);
    return Math.min(p+1, 5); // next lower order place (bounded)
  }

  // Parent #1 calculation: zero the 1000s digit; if it's already zero, zero 10000s.
  function parent1FromAny(id){
    const n = parseInt(base(id),10);
    const thousands = Math.floor(n/1000)%10;
    if(thousands!==0) return String(n - thousands*1000).padStart(6,'0');
    const tenThousands = Math.floor(n/10000)%10;
    if(tenThousands!==0) return String(n - tenThousands*10000).padStart(6,'0');
    return null;
  }

  async function parent2FromP1(p1){
    if(!p1) return null;
    const g = `${p1}.1`;
    return (await resolve(g)) ? g : null;
  }

  // Enumerate siblings of the current person
  async function listSiblings(id){
    const baseId = base(id);
    const d = digits(baseId);
    const pos = currentIndexPos(baseId);
    const keep = d.slice();
    const out = [];
    for(let k=1; k<=9; k++){
      if(k===d[pos]) continue;      // skip self
      const dd = keep.slice();
      dd[pos]=k;
      // zero-out lower places to canonicalize
      for(let p=pos+1; p<6; p++) dd[p]=0;
      const cand = fromDigits(dd);
      if(await resolve(cand)) out.push(cand);
    }
    return out;
  }

  // Enumerate children of the current person
  async function listChildren(id){
    const baseId = base(id);
    const d = digits(baseId);
    const pos = childrenIndexPos(baseId);
    const dd = d.slice();
    // zero lower places first
    for(let p=pos; p<6; p++) dd[p]=0;
    const out=[];
    for(let k=1; k<=9; k++){
      const row = dd.slice();
      row[pos]=k;
      const cand = fromDigits(row);
      if(await resolve(cand)) out.push(cand);
    }
    return out;
  }

  // Long-press editor (SoftEdit)
  let lpTimer=null;
  function longPress(el, fn, ms=650){
    if(!el) return;
    let moved=false;
    el.addEventListener('touchstart', e=>{ moved=false; clearTimeout(lpTimer); lpTimer=setTimeout(()=>{ if(!moved) fn(e); }, ms); }, {passive:true});
    el.addEventListener('touchmove', ()=>{ moved=true; clearTimeout(lpTimer); }, {passive:true});
    el.addEventListener('touchend', ()=>{ clearTimeout(lpTimer); }, {passive:true});
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

  // Render anchor with background stage
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
    const imgWrap=document.createElement('div'); card.appendChild(imgWrap);
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

  // Generic people grid
  async function showPeopleGrid(ids, titleText){
    if(!$grid) return;
    $grid.innerHTML='';
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
  }

  // Gestures
  async function swipeRight(){
    if(!anchorId) return;
    if(isSpouse(anchorId)){ await loadAnchor(base(anchorId)); return; }
    const s=`${anchorId}.1`; if(await resolve(s)) await loadAnchor(s);
  }
  async function swipeUp(){
    // show two parents of current person
    if(!$grid||!anchorId) return;
    $grid.innerHTML=''; showAnchor(false);
    const p1=parent1FromAny(anchorId);
    const row=document.createElement('div'); row.className='parent-row';
    if(p1){
      addCard(row,p1,'Parent #1',true);
      const p2=await parent2FromP1(p1);
      if(p2) addCard(row,p2,'Parent #2',true);
      else {
        const ph=(await resolve(PH_P2))||(await resolve(PH_MISS));
        const tmp=ph?'Parent #2 (placeholder)':'Parent #2';
        addCard(row,tmp,'Parent #2',false);
        const last=row.lastElementChild; if(last){ const im=last.querySelector('img'); if(im&&ph) im.src=ph; }
      }
    } else {
      const m=document.createElement('div'); m.textContent='— no parent #1 —'; m.style.textAlign='center'; m.style.opacity='.8'; row.appendChild(m);
    }
    $grid.appendChild(row);
  }
  async function swipeLeft(){
    if(!anchorId) return;
    const sibs = await listSiblings(anchorId);
    await showPeopleGrid(sibs, 'Siblings');
  }
  async function swipeDown(){
    if(!anchorId) return;
    const kids = await listChildren(anchorId);
    await showPeopleGrid(kids, 'Children');
  }

  // Touch listeners
  let sx=0, sy=0;
  function tstart(e){ const t=e.changedTouches[0]; sx=t.clientX; sy=t.clientY; }
  function tend(e){
    const t=e.changedTouches[0]; const dx=t.clientX-sx, dy=t.clientY-sy;
    const ax=Math.abs(dx), ay=Math.abs(dy), MIN=30;
    if(ax>ay && ax>MIN){ if(dx>0) swipeRight(); else swipeLeft(); }
    else if(ay>ax && ay>MIN){ if(dy<0) swipeUp(); else swipeDown(); }
  }

  async function boot(){
    let id=(location.hash||'').replace('#','').trim(); if(!id) id='100000';
    await loadAnchor(id);
    if($startBtn){ $startBtn.addEventListener('click', ()=>{ const nid=prompt('Enter starting ID:', id)||id; location.hash=nid; location.reload(); }); }
    document.addEventListener('touchstart', tstart, {passive:true});
    document.addEventListener('touchend', tend, {passive:true});
  }
  if(document.readyState==='complete'||document.readyState==='interactive') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
