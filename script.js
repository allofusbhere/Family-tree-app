// SwipeTree rc1b-touchfix script.js
(function(){
  function on(el, ev, fn, opts){ el && el.addEventListener(ev, fn, opts||false); }

  function installSwipe(el){
    if(!el) return;
    let sx=0, sy=0, dx=0, dy=0, active=false;

    on(el,'touchstart',e=>{
      const t=e.changedTouches[0]; sx=t.clientX; sy=t.clientY; dx=0; dy=0; active=true;
    },{passive:false});

    on(el,'touchmove',e=>{
      if(!active) return;
      const t=e.changedTouches[0]; dx=t.clientX-sx; dy=t.clientY-sy;
      e.preventDefault();
    },{passive:false});

    on(el,'touchend',e=>{
      if(!active) return; active=false;
      const TH=30;
      if(Math.abs(dx)>Math.abs(dy)){
        if(dx>TH){ goRight(); return; }
        if(dx<-TH){ goLeft(); return; }
      } else {
        if(dy<-TH){ goUp(); return; }
        if(dy>TH){ goDown(); return; }
      }
    },{passive:false});

    on(el,'touchcancel',()=>{active=false;},{passive:false});
  }

  // Placeholder nav funcs (to be replaced with real family-tree logic)
  window.goLeft = ()=>alert("Siblings");
  window.goRight = ()=>alert("Spouse");
  window.goUp = ()=>alert("Parents");
  window.goDown = ()=>alert("Children");

  function cleanNames(){
    const el=document.getElementById('displayName');
    if(el){ el.textContent=(el.textContent||'').replace(/\\u00A0/g,'').trim(); }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const surface=document.getElementById('stage')||document.body;
    installSwipe(surface);
    cleanNames();
    on(document.getElementById('startBtn'),'click',()=>{
      const id=document.getElementById('idInput').value.trim();
      if(id){ document.getElementById('displayId').textContent=id; }
    });
  });
})();