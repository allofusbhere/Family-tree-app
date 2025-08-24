
/* SwipeTree Primary Update v5c
   - Fixed image base: https://allofusbhere.github.io/family-tree-images/
   - No fallbacks; authoritative location per user.
   - Core nav + grid + swipe + tap-to-anchor.
*/
(function(){
  var state = window.SwipeTreeState = window.SwipeTreeState || { currentId: null, history: [] };
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function getLabel(id){ try { return localStorage.getItem("label:"+String(id)) || ""; } catch(e){ return ""; } }

  var IMAGE_BASES = (window.SWIPE_IMAGE_BASES && window.SWIPE_IMAGE_BASES.slice()) || ["https://allofusbhere.github.io/family-tree-images/"];
  function buildSrc(base, id){ return (base || "") + String(id) + ".jpg"; }

  function setImgSrc(img, id){
    // Single authoritative base
    img.src = buildSrc(IMAGE_BASES[0], id);
  }

  function setHash(id){
    try {
      var url = new URL(location.href);
      url.hash = "id=" + String(id);
      history.replaceState(null, "", url.toString());
    } catch(e){}
  }

  function updateAnchorImage(id){
    var img = $("#anchor-img"); if (!img) return;
    setImgSrc(img, id);
    img.setAttribute("data-id", String(id));
  }
  function updateAnchorLabel(id){
    var el = $("#anchor-name"); if (!el) return;
    el.textContent = getLabel(id) || "";
  }

  function setAnchor(id){
    if (!id) return;
    id = String(id);
    if (state.currentId && state.currentId !== id){ state.history.push(state.currentId); }
    state.currentId = id;
    setHash(id);

    if (typeof window.renderAnchor === "function"){ window.renderAnchor(id); }
    else { updateAnchorImage(id); updateAnchorLabel(id); }

    closeOverlay();
  }

  function goBack(){ var prev = state.history.pop(); if (prev){ setAnchor(prev); } }

  function openOverlay(title){ $("#overlay-title").textContent = title || "Grid"; $("#overlay").classList.remove("hidden"); }
  function closeOverlay(){ $("#overlay").classList.add("hidden"); var grid=$("#grid-dynamic"); if(grid) grid.innerHTML=""; }

  function renderGrid(items, title){
    var grid = $("#grid-dynamic"); if (!grid) return;
    grid.innerHTML = "";
    items.slice(0,9).forEach(function(item){
      var id = String(item.id);
      var tile = document.createElement("div"); tile.className="tile"; tile.setAttribute("data-id", id);
      var img = document.createElement("img"); img.alt=""; img.draggable=false; setImgSrc(img, id);
      var cap = document.createElement("div"); cap.className="cap"; cap.textContent = item.label || getLabel(id) || "";
      tile.appendChild(img); tile.appendChild(cap); grid.appendChild(tile);
    });
    $("#overlay-title").textContent = title || "Grid"; openOverlay(title);
  }

  function onGridTap(ev){ var t=ev.target.closest("[data-id]"); if(!t) return; var id=t.getAttribute("data-id"); if(id) setAnchor(id); }

  function ensureHooks(){
    ["fetchSpouseItems","fetchSiblingItems","fetchParentItems","fetchChildItems"].forEach(function(name){
      if (typeof window[name] !== "function"){ window[name] = function(){ return []; }; }
    });
  }

  var sx=0, sy=0;
  function onTouchStart(e){ var t=e.changedTouches&&e.changedTouches[0]; if(!t) return; sx=t.clientX; sy=t.clientY; }
  function onTouchEnd(e){
    var t=e.changedTouches&&e.changedTouches[0]; if(!t) return;
    var dx=t.clientX-sx, dy=t.clientY-sy; var ax=Math.abs(dx), ay=Math.abs(dy); var TH=30;
    if (ax<TH && ay<TH) return;
    if (ax>ay){
      if (dx>0){ var s=window.fetchSpouseItems(state.currentId)||[]; if(s.length) renderGrid(s,"Spouse"); }
      else { var sb=window.fetchSiblingItems(state.currentId)||[]; if(sb.length) renderGrid(sb,"Siblings"); }
    } else {
      if (dy<0){ var p=window.fetchParentItems(state.currentId)||[]; if(p.length) renderGrid(p,"Parents"); }
      else { var c=window.fetchChildItems(state.currentId)||[]; if(c.length) renderGrid(c,"Children"); }
    }
  }

  function init(){
    ensureHooks();
    var m=String(location.hash||"").match(/id=([0-9.]+)/);
    var startId = m ? m[1] : "100000";
    setAnchor(startId);

    var closeBtn=$("#overlay-close"); if(closeBtn) closeBtn.addEventListener("click", closeOverlay, false);
    var backBtn=$("#backBtn"); if(backBtn) backBtn.addEventListener("click", goBack, false);

    var grid=$("#grid-dynamic"); if(grid){ grid.addEventListener("click", onGridTap, false); grid.addEventListener("touchend", onGridTap, false); }
    var stage=$("#stage"); if(stage){ stage.addEventListener("touchstart", onTouchStart, {passive:true}); stage.addEventListener("touchend", onTouchEnd, {passive:true}); }
  }

  if (document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", init, { once:true }); }
  else { init(); }

  window.SwipeTree = { setAnchor:setAnchor, get currentId(){return state.currentId;}, goBack:goBack, renderGrid:renderGrid, closeOverlay:closeOverlay };
})();
