/*! script.js — rc1b WORKING CORE (replace this file)
 *  Purpose: Restore iPad swipes while keeping your real app logic unchanged.
 *  How:     1) Loads existing core: script.v132.js
 *           2) Applies iOS touch fix + NBSP cleanup
 *  Notes:   No placeholders. Uses your actual goLeft/goRight/goUp/goDown.
 */
(function(){
  function load(src, cb){
    var s=document.createElement('script');
    s.src=src; s.defer=true; s.onload=cb; s.onerror=function(){console.error("Failed to load", src)};
    document.head.appendChild(s);
  }

  // Disable Safari overscroll & allow JS to handle gestures
  (function injectCSS(){
    try{
      var css="html,body{height:100%;} #stage,body{overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;}";
      var tag=document.createElement('style');
      tag.appendChild(document.createTextNode(css));
      document.head.appendChild(tag);
    }catch(e){}
  })();

  function bindSwipes(){
    var surface = document.getElementById('stage') ||
                  document.querySelector('.stage') ||
                  document.querySelector('#anchor') ||
                  document.body;
    if(!surface) return;

    var sx=0, sy=0, dx=0, dy=0, active=false;
    function on(el,ev,fn,opts){ el && el.addEventListener(ev,fn,opts||false); }

    on(surface,'touchstart',function(e){
      var t=e.changedTouches && e.changedTouches[0]; if(!t) return;
      sx=t.clientX; sy=t.clientY; dx=0; dy=0; active=true;
    },{passive:false});

    on(surface,'touchmove',function(e){
      if(!active) return;
      var t=e.changedTouches && e.changedTouches[0]; if(!t) return;
      dx=t.clientX - sx; dy=t.clientY - sy;
      e.preventDefault(); // stop page scroll so gestures work
    },{passive:false});

    on(surface,'touchend',function(){
      if(!active) return; active=false;
      var TH=30;
      if(Math.abs(dx)>Math.abs(dy)){
        if(dx>TH  && typeof window.goRight==='function') window.goRight();   // spouse
        if(dx<-TH && typeof window.goLeft ==='function') window.goLeft();    // siblings
      }else{
        if(dy<-TH && typeof window.goUp   ==='function') window.goUp();      // parents
        if(dy>TH  && typeof window.goDown ==='function') window.goDown();    // children
      }
    },{passive:false});

    on(surface,'touchcancel',function(){ active=false; },{passive:false});
  }

  function cleanName(){
    try{
      var el = document.getElementById('displayName') ||
               document.querySelector('[data-role="name"]') ||
               document.querySelector('.anchor-name');
      if(el){ el.textContent = (el.textContent||"").replace(/\u00A0/g,"").trim(); }
    }catch(e){}
  }

  // Load your core logic first, then wire the swipe fix to call your real functions
  document.addEventListener('DOMContentLoaded', function(){
    load('script.v132.js', function(){
      // Let your core initialize, then patch touch behavior
      setTimeout(function(){
        bindSwipes();
        cleanName();
      }, 0);
    });
  });
})();