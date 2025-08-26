
/* script.v132.js — rc2i (Back + Start solid wiring)
   Goals:
   - Show Back ONLY when useful (grid open OR historyStack > 1)
   - Make Start actually navigate + populate historyStack
   - Initialize historyStack with current anchor (from #id hash or input)
   - Never duplicate consecutive IDs in the stack
   - Keep all logic self-contained; do NOT touch relationship math
*/

(function(){
  // ---------- Utilities ----------
  function getIdFromHash(){
    const m = (location.hash||'').match(/#id=([0-9]+(?:\.1)?)/);
    return m ? m[1] : null;
  }
  function isValidId(v){ return /^[0-9]+(?:\.1)?$/.test(String(v||'')); }

  function safeGo(id){
    // Prefer app's go(id) if present
    if (typeof window.go === 'function'){
      try { window.go(id); return true; } catch(e){ /* fallthrough */ }
    }
    // Fallback: update hash so app can react
    try { location.hash = '#id=' + id; return true; } catch(e){}
    return false;
  }

  function ensureHistory(){
    if (!Array.isArray(window.historyStack)) window.historyStack = [];
    return window.historyStack;
  }

  function top(stack){ return stack.length ? stack[stack.length-1] : null; }

  function pushId(id){
    const hs = ensureHistory();
    if (!isValidId(id)) return;
    if (top(hs) === id) return; // no dupes
    hs.push(id);
    updateBackVisibility();
  }

  // ---------- Back button ----------
  function ensureBack(){
    let btn = document.getElementById('st-back-btn');
    if (!btn){
      btn = document.createElement('button');
      btn.id = 'st-back-btn';
      btn.type = 'button';
      btn.textContent = 'Back';
      Object.assign(btn.style, {
        position:'fixed', top:'14px', left:'14px', zIndex:'1200',
        padding:'10px 14px', borderRadius:'999px',
        border:'1px solid rgba(255,255,255,0.25)',
        background:'rgba(0,0,0,0.55)', color:'#fff',
        font:'600 14px system-ui, sans-serif',
        backdropFilter:'blur(6px)', cursor:'pointer', display:'none'
      });
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

    // 2) Pop historyStack if available
    const hs = ensureHistory();
    if (hs.length > 1){
      hs.pop(); // remove current
      const prev = top(hs);
      if (prev){
        safeGo(prev);
      }
      updateBackVisibility();
      return;
    }
  }

  function updateBackVisibility(){
    const btn = document.getElementById('st-back-btn') || ensureBack();
    let visible = false;

    if (document.querySelector('.overlay.parents.open, .overlay.siblings.open, .overlay.children.open, .overlay.spouse.open')){
      visible = true;
    } else {
      const hs = ensureHistory();
      if (hs.length > 1) visible = true;
    }
    btn.style.display = visible ? 'block' : 'none';
  }

  // Hook native pushes into visibility updates
  function hookHistoryStack(){
    const hs = ensureHistory();
    const origPush = hs.push;
    hs.push = function(){
      const result = origPush.apply(this, arguments);
      updateBackVisibility();
      return result;
    };
  }

  // ---------- Start wiring ----------
  function wireStart(){
    // Find the input + any button labeled "Start"
    const input = document.querySelector('input[type="text"], input#startId, input[name="startId"]');
    let startBtn = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
      .find(b => (b.textContent||b.value||'').trim().toLowerCase() === 'start');
    if (!startBtn){
      // fallback: first button after the input
      const nextBtn = input && input.closest('label, div, form, body').querySelector('button');
      if (nextBtn) startBtn = nextBtn;
    }
    if (!input || !startBtn) return;

    function startNav(){
      const raw = (input.value||'').trim();
      if (!isValidId(raw)) return;
      if (safeGo(raw)) pushId(raw);
    }
    startBtn.addEventListener('click', startNav);

    // Also allow Enter in the input
    input.addEventListener('keypress', (e)=>{
      if (e.key === 'Enter'){ e.preventDefault(); startNav(); }
    });
  }

  // ---------- Initial boot ----------
  function init(){
    ensureBack();
    hookHistoryStack();
    wireStart();

    // Bootstrap the initial anchor into the stack once
    const fromHash = getIdFromHash();
    const input = document.querySelector('input[type="text"], input#startId, input[name="startId"]');
    const seed = isValidId(fromHash) ? fromHash : (isValidId(input && input.value) ? input.value.trim() : '100000');
    const hs = ensureHistory();
    if (hs.length === 0) hs.push(seed);

    updateBackVisibility();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Expose for debugging
  window.__st_rc2i = { pushId, updateBackVisibility };
})();
