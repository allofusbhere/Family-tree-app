(()=>{
  // SwipeTree SoftEdit v1.3 — self-contained add-on
  // No global pollution
  const cfg = {
    fnPath: '/.netlify/functions/labels',
    lpMs: 500
  };

  const $ = (sel, root=document)=>root.querySelector(sel);

  const cacheBust = (url)=>{
    const u = new URL(url, location.origin);
    u.searchParams.set('ts', Date.now().toString());
    return u.toString();
  };

  function currentId(){
    try{
      const h = location.hash || '';
      const m = h.match(/id=(\d+)/);
      if (m) return m[1];
    }catch(e){}
    return null;
  }

  function largestImage(){
    const anchor = $('#anchorImage') || $('#anchor') || null;
    if(anchor && anchor.tagName==='IMG') return anchor;
    const imgs = Array.from(document.images || []);
    if(!imgs.length) return null;
    return imgs.sort((a,b)=>(b.naturalWidth*b.naturalHeight)-(a.naturalWidth*a.naturalHeight))[0];
  }

  function disableIOSCallout(el){
    try{
      el.style.webkitTouchCallout='none';
      el.style.userSelect='none';
    }catch(e){}
  }

  function buildModal(){
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);z-index:9999;';
    wrap.innerHTML = `
      <div style="min-width:280px;max-width:90vw;background:#111;color:#eee;border-radius:12px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.5);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <h3 style="margin:0 0 12px;font-weight:600;">Edit Label</h3>
        <label style="display:block;margin:8px 0 4px;">Name</label>
        <input id="se_name" placeholder="Full name" style="width:100%;padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a1a;color:#eee;">
        <label style="display:block;margin:12px 0 4px;">DOB</label>
        <input id="se_dob" placeholder="YYYY-MM-DD" style="width:100%;padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a1a;color:#eee;">
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
          <button id="se_cancel" style="padding:8px 12px;border-radius:8px;background:#333;color:#eee;border:0;">Cancel</button>
          <button id="se_save" style="padding:8px 12px;border-radius:8px;background:#4f8cff;color:#fff;border:0;">Save</button>
        </div>
      </div>`;
    return wrap;
  }

  async function getLabel(id){
    const url = cacheBust(`${cfg.fnPath}?id=${encodeURIComponent(id)}`);
    const resp = await fetch(url, {cache:'no-store'});
    if(!resp.ok) return { name:'', dob:'' };
    return resp.json();
  }

  async function postLabel(id, payload){
    const url = cacheBust(cfg.fnPath);
    const resp = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
      body: JSON.stringify({ id, ...payload })
    });
    if(!resp.ok) throw new Error('save failed');
    return resp.json();
  }

  function renderCaption(name, dob){
    // renders below the largest image
    let cap = document.getElementById('se_caption');
    if(!cap){
      cap = document.createElement('div');
      cap.id='se_caption';
      cap.style.cssText='text-align:center;color:#ddd;margin-top:10px;font-size:14px;';
      const img = largestImage();
      if(img && img.parentElement){
        img.parentElement.appendChild(cap);
      }else{
        document.body.appendChild(cap);
      }
    }
    const safeName = (name||'').trim();
    const year = (dob||'').trim().slice(0,4);
    cap.textContent = safeName ? (year ? `${safeName}\n${year}` : safeName) : '';
  }

  function longPress(el, ms, onFire){
    let t, down=false;
    const start = (e)=>{
      down=true;
      t=setTimeout(()=>{ if(down) onFire(e); }, ms);
    };
    const end = ()=>{ down=false; clearTimeout(t); };
    el.addEventListener('touchstart', start, {passive:true});
    el.addEventListener('touchend', end, {passive:true});
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
  }

  async function init(){
    const id = currentId();
    const img = largestImage();
    if(!id || !img) return; // no-op if page not ready
    disableIOSCallout(img);

    try{
      const data = await getLabel(id);
      renderCaption(data.name, data.dob);
    }catch(e){/* ignore */}

    longPress(img, cfg.lpMs, async ()=>{
      const modal = buildModal();
      document.body.appendChild(modal);
      const nameEl=$('#se_name', modal), dobEl=$('#se_dob', modal);
      try{
        const data = await getLabel(id);
        nameEl.value = data.name || '';
        dobEl.value = data.dob || '';
      }catch(_){}
      $('#se_cancel', modal).onclick = ()=> modal.remove();
      $('#se_save', modal).onclick = async ()=>{
        const name=nameEl.value.trim();
        const dob=dobEl.value.trim();
        try{
          await postLabel(id, {name, dob});
          renderCaption(name, dob);
        }catch(e){/* ignore */}
        modal.remove();
      };
    });
  }

  // Run once DOM is interactive; also re-run after small delay to catch late images
  const ready = ()=>init();
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', ready, {once:true});
  }else{
    ready();
  }
  setTimeout(ready, 1200);
})();
