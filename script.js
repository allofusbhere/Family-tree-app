
/* SwipeTree — script.js (AnchorBG + SoftEdit + Shield) */
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

  // ------- Anti-hint shield (removes legacy UIs on sight) -------
  function purgeHints(root=document){
    const killText=/long-press to edit|edit label/i;
    const walk=(el)=>{
      try{
        if(el.nodeType!==1) return;
        if(killText.test(el.textContent||'')) { el.remove(); return; }
        if(/edit|label/i.test(el.id||'') || /(edit|label)/i.test(el.className||'')){
          if(killText.test(el.textContent||'')) { el.remove(); return; }
        }
      }catch{}
    };
    (root.querySelectorAll('*')||[]).forEach(walk);
  }
  purgeHints();
  const mo=new MutationObserver(muts=>{
    muts.forEach(m=>m.addedNodes&&m.addedNodes.forEach(n=>{ if(n.nodeType===1) purgeHints(n); }));
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});

  // ------- Labels (local only) -------
  const getLabels=()=>{ try{return JSON.parse(localStorage.getItem('st_labels')||'{}');}catch{return {};}};
  const setLabels=(m)=>localStorage.setItem('st_labels',JSON.stringify(m||{}));
  const showName=(id)=>getLabels()[id]||id;
  function saveName(id,text){ const m=getLabels(); if(text&&text.trim()) m[id]=text.trim(); else delete m[id]; setLabels(m); }

  function showAnchor(show){
    if(!$anchor) return;
    if(show){ $anchor.style.display='grid'; }
    else { $anchor.innerHTML=''; $anchor.style.display='none'; }
  }

  let anchorId=null;

  const urls=id=>EXT.map(e=>IMG_BASE+id+e);
  function exists(u){ return new Promise(r=>{ const i=new Image(); i.onload=()=>r(true); i.onerror=()=>r(false); i.src=u+((u.includes('?')?'&':'?')+'cb='+Date.now()); }); }
  async function resolve(id){ for(const u of urls(id)){ if(await exists(u)) return u; } return null; }

  const base=id=>{ const d=id.indexOf('.'); return d===-1?id:id.slice(0,d); };
  const isSpouse=id=>id.includes('.1');
  const toInt=id=>parseInt(base(id),10);

  function parent1(id){
    const n=toInt(id); if(Number.isNaN(n)) return null;
    const t=Math.floor(n/1000)%10; if(t!==0) return String(n - t*1000);
    const u=Math.floor(n/10000)%10; if(u!==0) return String(n - u*10000);
    return null;
  }
  async function parent2(p1){ if(!p1) return null; const g=`${p1}.1`; return (await resolve(g)) ? g : null; }

  // Long-press helper (editor only on long-press; no hints)
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
    save.onclick=()=>{ saveName(id,input.value); renderAnchor(id); document.body.removeChild(overlay); };
    document.body.appendChild(overlay); input.focus();
  }

  // Anchor renderer: background stage (always centered)
  async function renderAnchor(id){
    $anchor.innerHTML='';
    const url=(await resolve(id))||(await resolve(PH_MISS))||'';
    const stage=document.createElement('div');
    stage.className='stage-bg';
    stage.setAttribute('role','img');
    stage.setAttribute('aria-label', id);
    stage.style.backgroundImage=`url('${url}')`;
    $anchor.appendChild(stage);

    const label=document.createElement('div');
    label.className='label';
    label.textContent=showName(id);
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

  async function swipeRight(){
    if(!anchorId) return;
    if(isSpouse(anchorId)){ await loadAnchor(base(anchorId)); return; }
    const s=`${anchorId}.1`; if(await resolve(s)) await loadAnchor(s);
  }

  function addCard(parentEl, personId, title, clickable=true){
    const card=document.createElement('div');
    card.className='card'+(clickable?' clickable':'');

    const ttl=document.createElement('div');
    ttl.className='title'; ttl.textContent=title;
    card.appendChild(ttl);

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

  async function swipeUp(){
    if(!$grid||!anchorId) return;
    $grid.innerHTML=''; showAnchor(false);
    const p1=parent1(anchorId);
    const row=document.createElement('div'); row.className='parent-row';
    if(p1){
      addCard(row,p1,'Parent #1',true);
      const p2=await parent2(p1);
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

  // Touch swipes
  let sx=0, sy=0;
  function tstart(e){ const t=e.changedTouches[0]; sx=t.clientX; sy=t.clientY; }
  function tend(e){ const t=e.changedTouches[0]; const dx=t.clientX-sx, dy=t.clientY-sy; const ax=Math.abs(dx), ay=Math.abs(dy); const MIN=30;
    if(ax>ay && ax>MIN){ if(dx>0) swipeRight(); }
    else if(ay>ax && ay>MIN){ if(dy<0) swipeUp(); } }

  async function boot(){
    let id=(location.hash||'').replace('#','').trim(); if(!id) id='100000';
    await loadAnchor(id);
    if($startBtn){ $startBtn.addEventListener('click', ()=>{ const nid=prompt('Enter starting ID:', id)||id; location.hash=nid; location.reload(); }); }
    document.addEventListener('touchstart', tstart, {passive:true});
    document.addEventListener('touchend', tend, {passive:true});
  }
  if(document.readyState==='complete'||document.readyState==='interactive') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})(); 
