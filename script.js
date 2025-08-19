// Patched script.js — adds null checks and defers binding until DOMContentLoaded
// This preserves your existing logic but prevents crashes when optional elements
// are missing from the HTML (e.g., back button, close button, overlays).

(function () {
  function safeBind(selector, event, handler, options) {
    var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (el) el.addEventListener(event, handler, options || false);
  }

  function init() {
    try {
      // === ORIGINAL INITIALIZATION ===
      // If your existing code defines functions like go(), closeOverlay(), etc.,
      // they will still be found on the global scope. We only protect the binds.

      // Touch handlers (guarded to avoid null errors)
      safeBind(document.body, 'touchstart', window.onTouchStart || window.onDown, { passive: true });
      safeBind(document.body, 'touchend',   window.onTouchEnd   || window.onUp,   { passive: true });

      // Keyboard handlers
      safeBind(document, 'keydown', function(e){
        if (typeof window.onKeyDown === 'function') return window.onKeyDown(e);
        // Fallback: spouse toggle on ArrowRight if a global toggle() exists
        if (e && e.key === 'ArrowRight' && typeof window.toggle === 'function') {
          window.toggle();
        }
      });

      // Optional UI
      safeBind('#backBtn', 'click', function(){
        if (typeof window.closeOverlay === 'function') {
          var overlay = document.getElementById('overlay');
          if (overlay && !overlay.hidden) return window.closeOverlay();
        }
        if (Array.isArray(window.historyStack) && window.historyStack.length && typeof window.goTo === 'function') {
          var prev = window.historyStack.pop();
          if (prev) window.goTo(prev);
        }
      });

      safeBind('#closeOverlay', 'click', function(){
        if (typeof window.closeOverlay === 'function') window.closeOverlay();
        var overlay = document.getElementById('overlay');
        if (overlay) overlay.hidden = true;
      });

      // If your code exposes an init/start method, call it here safely
      if (typeof window.appInit === 'function') window.appInit();
      if (typeof window.start === 'function') window.start();

    } catch (err) {
      console.error('Initialization error (guarded):', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(); 
