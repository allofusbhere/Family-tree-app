
/* SwipeTree Primary Update v5
   - Core navigation state (anchor, history, URL hash)
   - Tap-to-anchor from any rendered grid tile (fixes spouse reappearing/name carryover)
   - Overlay lifecycle and generic grid renderer
   - Hook points for your existing relationship calculators (no hardcoding here)
*/

(function(){
  // ===== State =====
  var state = window.SwipeTreeState = window.SwipeTreeState || {
    currentId: null,
    history: [],
  };

  // ===== Utilities =====
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function getLabel(id){
    try { return localStorage.getItem("label:"+String(id)) || ""; } catch(e){ return ""; }
  }

  function setHash(id){
    try {
      var url = new URL(location.href);
      url.hash = "id=" + String(id);
      history.replaceState(null, "", url.toString());
    } catch(e){ /* no-op */ }
  }

  // ===== Anchor rendering =====
  function updateAnchorImage(id){
    var img = $("#anchor-img");
    if (!img) return;
    img.src = String(id) + ".jpg";
    img.setAttribute("data-id", String(id));
  }

  function updateAnchorLabel(id){
    var el = $("#anchor-name");
    if (!el) return;
    el.textContent = getLabel(id) || "";
  }

  function setAnchor(id){
    if (!id) return;
    id = String(id);
    if (state.currentId && state.currentId !== id){
      state.history.push(state.currentId);
    }
    state.currentId = id;
    setHash(id);

    if (typeof window.renderAnchor === "function"){
      window.renderAnchor(id);
    } else {
      updateAnchorImage(id);
      updateAnchorLabel(id);
    }
    closeOverlay(); // hide any open grids
  }

  function goBack(){
    var prev = state.history.pop();
    if (prev){ setAnchor(prev); }
  }

  // ===== Overlay & grid =====
  function openOverlay(title){
    $("#overlay-title").textContent = title || "Grid";
    $("#overlay").classList.remove("hidden");
  }
  function closeOverlay(){
    $("#overlay").classList.add("hidden");
    var grid = $("#grid-dynamic");
    if (grid) grid.innerHTML = "";
  }

  // Generic grid renderer: pass array of { id, label? }
  function renderGrid(items, title){
    var grid = $("#grid-dynamic");
    if (!grid) return;
    grid.innerHTML = "";
    items.slice(0,9).forEach(function(item){
      var id = String(item.id);
      var tile = document.createElement("div");
      tile.className = "tile";
      tile.setAttribute("data-id", id);

      var img = document.createElement("img");
      img.alt = id;
      img.draggable = false;
      img.src = id + ".jpg";

      var cap = document.createElement("div");
      cap.className = "cap";
      cap.textContent = item.label || getLabel(id) || "";

      tile.appendChild(img);
      tile.appendChild(cap);
      grid.appendChild(tile);
    });
    $("#overlay-title").textContent = title || "Grid";
    openOverlay(title);
  }

  // Tap/click any tile -> anchor to that ID
  function onGridTap(ev){
    var tile = ev.target.closest("[data-id]");
    if (!tile) return;
    var targetId = tile.getAttribute("data-id");
    if (!targetId) return;
    setAnchor(targetId);
  }

  // ===== Relationship hook shims =====
  // If you already have these globally, they'll be used. Otherwise, we provide
  // placeholder implementations that do nothing (to avoid breaking).
  function ensureHooks(){
    // Spouse
    if (typeof window.fetchSpouseItems !== "function"){
      window.fetchSpouseItems = function(currentId){ return []; };
    }
    if (typeof window.fetchSiblingItems !== "function"){
      window.fetchSiblingItems = function(currentId){ return []; };
    }
    if (typeof window.fetchParentItems !== "function"){
      window.fetchParentItems = function(currentId){ return []; };
    }
    if (typeof window.fetchChildItems !== "function"){
      window.fetchChildItems = function(currentId){ return []; };
    }
  }

  // Gesture bindings (basic)
  var touchStartX = 0, touchStartY = 0;
  function onTouchStart(e){
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    touchStartX = t.clientX; touchStartY = t.clientY;
  }
  function onTouchEnd(e){
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    var dx = t.clientX - touchStartX;
    var dy = t.clientY - touchStartY;
    var absX = Math.abs(dx), absY = Math.abs(dy);
    var TH = 30; // swipe threshold

    if (absX < TH && absY < TH) return; // not a swipe

    if (absX > absY){
      if (dx > 0){
        // Right: Spouse
        var items = window.fetchSpouseItems(state.currentId) || [];
        if (items.length){ renderGrid(items, "Spouse"); }
      } else {
        // Left: Siblings
        var items = window.fetchSiblingItems(state.currentId) || [];
        if (items.length){ renderGrid(items, "Siblings"); }
      }
    } else {
      if (dy < 0){
        // Up: Parents
        var items = window.fetchParentItems(state.currentId) || [];
        if (items.length){ renderGrid(items, "Parents"); }
      } else {
        // Down: Children
        var items = window.fetchChildItems(state.currentId) || [];
        if (items.length){ renderGrid(items, "Children"); }
      }
    }
  }

  // ===== Init =====
  function init(){
    ensureHooks();

    // URL start
    var m = String(location.hash || "").match(/id=([0-9.]+)/);
    var startId = m ? m[1] : (state.currentId || "100000");
    setAnchor(startId);

    // Close overlay
    var closeBtn = $("#overlay-close");
    if (closeBtn) closeBtn.addEventListener("click", closeOverlay, false);

    // Back
    var backBtn = $("#backBtn");
    if (backBtn) backBtn.addEventListener("click", goBack, false);

    // Tap tiles
    var grid = $("#grid-dynamic");
    if (grid){
      grid.addEventListener("click", onGridTap, false);
      grid.addEventListener("touchend", onGridTap, false);
    }

    // Bind basic swipes on the stage
    var stage = $("#stage");
    if (stage){
      stage.addEventListener("touchstart", onTouchStart, { passive: true });
      stage.addEventListener("touchend", onTouchEnd, { passive: true });
    }
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  // Public API
  window.SwipeTree = {
    setAnchor: setAnchor,
    get currentId(){ return state.currentId; },
    goBack: goBack,
    renderGrid: renderGrid,
    closeOverlay: closeOverlay
  };
})();
