/*! app-hook.js — rc1b iPad swipe restoration + label cleanup
 *  Drop-in replacement. No index.html edits required.
 *  - Injects minimal CSS to stop iOS Safari from hijacking swipes
 *  - Binds non-passive touch listeners on your main surface
 *  - Calls your existing goLeft/goRight/goUp/goDown functions
 *  - Cleans stray \u00A0 from the anchor name label
 */
(function(){
  function injectCSS(css){
    try{
      var tag=document.createElement('style');
      tag.type='text/css';
      tag.appendChild(document.createTextNode(css));
      document.head.appendChild(tag);
    }catch(e){}
  }

  // CSS to keep Safari from stealing gestures
  var css = [
    "html,body{height:100%;}",
    "#stage,body{overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;}"
  ].join("\n");
  injectCSS(css);

  function on(el,ev,fn,opts){ el && el.addEventListener(ev,fn,opts||false); }

  function installSwipe(surface){
    if(!surface) return;
    var sx=0, sy=0, dx=0, dy=0, active=false;

    on(surface,'touchstart',function(e){
      var t=e.changedTouches && e.changedTouches[0]; if(!t) return;
      sx=t.clientX; sy=t.clientY; dx=0; dy=0; active=true;
    },{passive:false});

    on(surface,'touchmove',function(e){
      if(!active) return;
      var t=e.changedTouches && e.changedTouches[0]; if(!t) return;
      dx=t.clientX - sx; dy=t.clientY - sy;
      e.preventDefault(); // block page scroll so swipe can be detected
    },{passive:false});

    on(surface,'touchend',function(){
      if(!active) return; active=false;
      var TH=30;
      if(Math.abs(dx)>Math.abs(dy)){
        if(dx>TH  && window.goRight) window.goRight();   // spouse
        if(dx<-TH && window.goLeft)  window.goLeft();    // siblings
      }else{
        if(dy<-TH && window.goUp)    window.goUp();      // parents
        if(dy>TH  && window.goDown)  window.goDown();    // children
      }
    },{passive:false});

    on(surface,'touchcancel',function(){ active=false; },{passive:false});
  }

  function cleanAnchorName(){
    try{
      var el = document.getElementById('displayName') ||
               document.querySelector('[data-role="name"]') ||
               document.querySelector('.anchor-name');
      if(el){ el.textContent = (el.textContent||"").replace(/\u00A0/g,"").trim(); }
    }catch(e){}
  }

  document.addEventListener('DOMContentLoaded', function(){
    // Prefer your dedicated surface if present
    var surface = document.getElementById('stage') ||
                  document.querySelector('.stage') ||
                  document.querySelector('#anchor') ||
                  document.body;
    installSwipe(surface);
    cleanAnchorName();
  });
})();