// SwipeTree rc1c glue: swipes/autostart/image fallback/NBSP cleanup
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
               document.querySelector('[data-role=\"name\"]') ||
               document.querySelector('.anchor-name');
      if(el){ el.textContent = (el.textContent||'').replace(/\\u00A0/g,'').trim(); }
    }catch(e){}
  }

  function getIdFromURL(){
    try{
      var h=(location.hash||'').replace(/^#/,'');  // id=100000
      var q=(location.search||'').replace(/^\\?/,''); // id=100000
      var params = new URLSearchParams(h.includes('=')?h:q);
      var id = params.get('id');
      return id && id.trim() ? id.trim() : null;
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

  function filenameFrom(src){
    try{ return src.split('/').pop().split('?')[0].split('#')[0]; }catch(e){ return src; }
  }
  function baseName(f){ var i=f.lastIndexOf('.'); return i>=0 ? f.slice(0,i) : f; }
  function nextExt(ext){ var i=EXT_ORDER.indexOf(ext); return (i>=0 && i<EXT_ORDER.length-1) ? EXT_ORDER[i+1] : null; }
  function isFromAppRepo(src){ return /\\/Family-tree-app\\//i.test(src); }

  document.addEventListener('error', function(e){
    var t=e.target;
    if(!(t && t.tagName==='IMG')) return;
    var file = filenameFrom(t.src); var name = baseName(file); var ext = file.slice(name.length) || ".jpg";
    var next = nextExt(ext);
    if(isFromAppRepo(t.src)){
      t.src = IMAGES_BASE + file; return;
    }
    if(next){ t.src = IMAGES_BASE + name + next; return; }
  }, true);

  document.addEventListener('DOMContentLoaded', function(){
    bindSwipes();
    cleanName();
    autoStart();
  });
})();