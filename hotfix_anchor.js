
(function(){
  // Ensure a real element exists and assign to ui.anchorType safely
  function ensureAnchorType(){
    var el = document.getElementById('anchorType');
    if (!el) {
      el = document.createElement('div');
      el.id = 'anchorType';
      el.className = 'legacy-hide';
      document.body.appendChild(el);
    }
    if (!window.ui) window.ui = {};
    window.ui.anchorType = el;
    return el;
  }
  // Run once at load (in case ui is initialized later)
  ensureAnchorType();

  // If go() exists, wrap it to guarantee anchorType before running
  function patchGo(){
    if (typeof window.go !== 'function') return false;
    var original = window.go;
    window.go = function(){
      ensureAnchorType();
      return original.apply(this, arguments);
    };
    return true;
  }

  // Try now; if go isn't defined yet, retry after DOM ready
  if (!patchGo()){
    document.addEventListener('DOMContentLoaded', patchGo);
  }
})();
