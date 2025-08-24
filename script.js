
/* SwipeTree Primary Update v5d (Diagnostic)
   - Fixed image base
   - Visible debug banner (no console needed)
   - Shows attempted URL + load status under the anchor
*/
(function(){
  var VERSION = "v5d-diagnostic";
  var state = window.SwipeTreeState = window.SwipeTreeState || { currentId: null, history: [] };
  function $(sel, root){ return (root||document).querySelector(sel); }
  function getLabel(id){ try { return localStorage.getItem("label:"+String(id)) || ""; } catch(e){ return ""; } }

  var IMAGE_BASE = (window.SWIPE_IMAGE_BASES && window.SWIPE_IMAGE_BASES[0]) || "https://allofusbhere.github.io/family-tree-images/";
  function buildSrc(id){ return IMAGE_BASE + String(id) + ".jpg"; }

  function setDebug(msg){
    var d=$("#debug"); if (!d) return;
    d.textContent = "["+VERSION+"] " + msg + " | base=" + IMAGE_BASE;
  }

  function updateAnchorImage(id){
    var img = $("#anchor-img"), urlEl=$("#anchor-url"), stat=$("#anchor-status");
    if (!img) return;
    var url = buildSrc(id);
    img.onload = function(){ if(stat) stat.textContent = "Status: loaded"; };
    img.onerror = function(){ if(stat) stat.textContent = "Status: FAILED to load"; };
    img.src = url;
    img.setAttribute("data-id", String(id));
    if (urlEl) urlEl.textContent = "URL: " + url;
  }
  function updateAnchorLabel(id){ var el=$("#anchor-name"); if (el) el.textContent = getLabel(id) || ""; }

  function setHash(id){
    try{ var u=new URL(location.href); u.hash="id="+String(id); history.replaceState(null,"",u.toString()); }catch(e){}
  }

  function setAnchor(id){
    if (!id) return;
    id = String(id);
    if (state.currentId && state.currentId !== id){ state.history.push(state.currentId); }
    state.currentId = id;
    setHash(id);
    updateAnchorImage(id);
    updateAnchorLabel(id);
    closeOverlay();
  }

  function goBack(){ var prev=state.history.pop(); if(prev) setAnchor(prev); }

  function openOverlay(t){ $("#overlay-title").textContent = t||"Grid"; $("#overlay").classList.remove("hidden"); }
  function closeOverlay(){ $("#overlay").classList.add("hidden"); var g=$("#grid-dynamic"); if(g) g.innerHTML=""; }

  function ensureHooks(){
    ["fetchSpouseItems","fetchSiblingItems","fetchParentItems","fetchChildItems"].forEach(function(n){
      if (typeof window[n] !== "function"){ window[n] = function(){ return []; }; }
    });
  }

  // Simple swipe bindings
  var sx=0, sy=0;
  function onTouchStart(e){ var t=e.changedTouches&&e.changedTouches[0]; if(!t) return; sx=t.clientX; sy=t.clientY; }
  function onTouchEnd(e){
    var t=e.changedTouches&&e.changedTouches[0]; if(!t) return;
    var dx=t.clientX-sx, dy=t.clientY-sy, ax=Math.abs(dx), ay=Math.abs(dy), TH=30;
    if (ax<TH && ay<TH) return;
    if (ax>ay){
      if (dx>0){ var s=window.fetchSpouseItems(state.currentId)||[]; if(s.length){ renderGrid(s,"Spouse"); } }
      else { var sb=window.fetchSiblingItems(state.currentId)||[]; if(sb.length){ renderGrid(sb,"Siblings"); } }
    } else {
      if (dy<0){ var p=window.fetchParentItems(state.currentId)||[]; if(p.length){ renderGrid(p,"Parents"); } }
      else { var c=window.fetchChildItems(state.currentId)||[]; if(c.length){ renderGrid(c,"Children"); } }
    }
  }

  function renderGrid(items, title){
    var grid = $("#grid-dynamic"); if (!grid) return;
    grid.innerHTML = "";
    items.slice(0,9).forEach(function(item){
      var id = String(item.id);
      var tile = document.createElement("div"); tile.className="tile"; tile.setAttribute("data-id", id);
      var img = document.createElement("img"); img.alt=""; img.draggable=false; img.src = buildSrc(id);
      var cap = document.createElement("div"); cap.className="cap"; cap.textContent = item.label || getLabel(id) || "";
      tile.appendChild(img); tile.appendChild(cap); grid.appendChild(tile);
    });
    $("#overlay-title").textContent = title || "Grid"; openOverlay(title);
  }

  function onGridTap(ev){ var t=ev.target.closest("[data-id]"); if(!t) return; var id=t.getAttribute("data-id"); if(id) setAnchor(id); }

  function init(){
    setDebug("script loaded");
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
})();