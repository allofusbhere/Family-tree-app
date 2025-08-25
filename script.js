// SwipeTree rc1c2 glue (no regex flags): swipes / autostart / image fallback / NBSP cleanup
(function(){
  var IMAGES_BASE = "https://allofusbhere.github.io/family-tree-images/";
  var EXT_ORDER = [".jpg",".JPG",".jpeg",".png"];

  function on(el, ev, fn, opts){ if(el) el.addEventListener(ev, fn, opts||false); }

  function bindSwipes(){
    var surface = document.getElementById('stage') || document.body;
    var sx=0, sy=0, dx=0, dy=0, active=false;
    on(surface,'touchstart',function(e){
      var t=e.changedTouches && e.changedTouches[0]; if(!t) return;
      sx=t.clientX; sy=t.clientY; dx=0; dy=0; active=true;
    }, {passive:false});
    on(surface,'touchmove',function(e){
      if(!active) return;
      var t=e.changedTouches && e.changedTouches[0]; if(!t) return;
      dx=t.clientX - sx; dy=t.clientY - sy;
      e.preventDefault();
    }, {passive:false});
    on(surface,'touchend',function(){
      if(!active) return; active=false;
      var TH=30;
      if(Math.abs(dx)>Math.abs(dy)){
        if(dx>TH  && typeof window.goRight==='function') window.goRight();
        if(dx<-TH && typeof window.goLeft ==='function') window.goLeft();
      } else {
        if(dy<-TH && typeof window.goUp   ==='function') window.goUp();
        if(dy>TH  && typeof window.goDown ==='function') window.goDown();
      }
    }, {passive:false});
    on(surface,'touchcancel',function(){ active=false; }, {passive:false});
  }

  function cleanName(){
    try{
      var el = document.getElementById('displayName') ||
               document.querySelector('[data-role="name"]') ||
               document.querySelector('.anchor-name');
      if(el){
        // no regex: split-join for NBSP removal
        el.textContent = (el.textContent||'').split('\u00A0').join('').trim();
      }
    }catch(e){}
  }

  function getIdFromURL(){
    try{
      var id = null;
      var h = (location.hash||'').replace(/^#/,'');    // e.g., id=100000
      if (h.indexOf('=') !== -1){
        var hp = new URLSearchParams(h);
        id = hp.get('id');
      } else {
        var q = (location.search||'').replace(/^\?/,''); // id=100000
        var qp = new URLSearchParams(q);
        id = qp.get('id');
      }
      if(id) id = id.trim();
      return id || null;
    }catch(e){ return null; }
  }
  function autoStart(){
    var id = getIdFromURL();
    if(!id) return;
    try{
      var input = document.getElementById('idInput');
      if(input) input.value = id;
      if (typeof window.start === 'function') window.start();
      else {
        var btn=document.getElementById('startBtn');
        if(btn) btn.click();
      }
    }catch(e){ console.warn('AutoStart failed', e); }
  }

  // IMG fallback without regex
  function filenameFrom(src){
    try{
      var p = src.split('/'); var last = p[p.length-1];
      return last.split('?')[0].split('#')[0];
    }catch(e){ return src; }
  }
  function baseName(f){
    var i=f.lastIndexOf('.'); return i>=0 ? f.slice(0,i) : f;
  }
  function extOf(f){
    var i=f.lastIndexOf('.'); return i>=0 ? f.slice(i) : '';
  }
  function isFromAppRepo(src){
    return src.indexOf('/Family-tree-app/') !== -1;
  }

  document.addEventListener('error', function(e){
    var t=e.target;
    if(!(t && t.tagName==='IMG')) return;
    var file = filenameFrom(t.src);
    var name = baseName(file);
    var ext  = extOf(file) || ".jpg";
    var attempts = parseInt(t.getAttribute('data-ext-attempt')||'0',10);

    if(isFromAppRepo(t.src)){
      t.src = IMAGES_BASE + file;
      t.setAttribute('data-ext-attempt','1');
      return;
    }
    if(attempts > 0 && attempts < EXT_ORDER.length){
      t.src = IMAGES_BASE + name + EXT_ORDER[attempts];
      t.setAttribute('data-ext-attempt', String(attempts+1));
      return;
    }
    // exhausted
  }, true);

  document.addEventListener('DOMContentLoaded', function(){
    bindSwipes();
    cleanName();
    autoStart();
  });
})();