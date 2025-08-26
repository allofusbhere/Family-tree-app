
/* script.v132.js — rc2g (Back-only integration)
   Implements:
   - Smart Back button: only visible if useful (grid open or historyStack > 1)
   - Behavior priority:
       1) If a grid is open → close it
       2) Else if historyStack available → go back to last anchor
       3) Else fallback to browser history.back()
   - Guardrail: Back button never dead; hidden when not usable
*/

(function(){
  function ensureBack(){
    let btn = document.getElementById('st-back-btn');
    if (!btn){
      btn = document.createElement('button');
      btn.id = 'st-back-btn';
      btn.type = 'button';
      btn.textContent = 'Back';
      btn.style.position = 'fixed';
      btn.style.top = '14px';
      btn.style.left = '14px';
      btn.style.zIndex = '1200';
      btn.style.padding = '10px 14px';
      btn.style.borderRadius = '999px';
      btn.style.border = '1px solid rgba(255,255,255,0.25)';
      btn.style.background = 'rgba(0,0,0,0.55)';
      btn.style.color = '#fff';
      btn.style.font = '600 14px system-ui, sans-serif';
      btn.style.backdropFilter = 'blur(6px)';
      btn.style.cursor = 'pointer';
      btn.style.display = 'none'; // hidden by default
      btn.addEventListener('click', backAction);
      document.body.appendChild(btn);
    }
    return btn;
  }

  function backAction(){
    // 1) Close open grids first
    const openGrid = document.querySelector('.overlay.parents.open, .overlay.siblings.open, .overlay.children.open, .overlay.spouse.open');
    if (openGrid){
      openGrid.classList.remove('open');
      updateBackVisibility();
      return;
    }

    // 2) Use historyStack if available
    const hs = window.historyStack;
    if (Array.isArray(hs) && hs.length > 1){
      hs.pop(); // remove current
      const prev = hs[hs.length-1];
      const id = (prev && typeof prev === 'object') ? (prev.id || prev.anchor || prev.value) : prev;
      if (id){
        try { location.hash = '#id=' + id; } catch(e){}
        if (typeof window.go === 'function'){ try{ window.go(id); }catch(e){} }
      }
      updateBackVisibility();
      return;
    }

    // 3) Fallback to browser history
    if (history.length > 1) history.back();
    updateBackVisibility();
  }

  function updateBackVisibility(){
    const btn = document.getElementById('st-back-btn') || ensureBack();
    let visible = false;

    // Grid open?
    if (document.querySelector('.overlay.parents.open, .overlay.siblings.open, .overlay.children.open, .overlay.spouse.open')){
      visible = true;
    }
    // History stack available?
    else if (Array.isArray(window.historyStack) && window.historyStack.length > 1){
      visible = true;
    }
    // Browser history fallback
    else if (history.length > 1){
      visible = true;
    }

    btn.style.display = visible ? 'block' : 'none';
  }

  function hookHistoryStack(){
    if (!window.historyStack) window.historyStack = [];
    const origPush = window.historyStack.push;
    window.historyStack.push = function(){
      const result = origPush.apply(this, arguments);
      updateBackVisibility();
      return result;
    };
  }

  function init(){
    ensureBack();
    hookHistoryStack();
    updateBackVisibility();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Expose update for external calls
  window.updateBackVisibility = updateBackVisibility;
})();
