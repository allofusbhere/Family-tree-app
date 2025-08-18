
// SwipeTree — Spouse-Only Swipe Test Build
(function(){
  const qs = (s, el=document)=> el.querySelector(s);
  const qsa = (s, el=document)=> Array.from(el.querySelectorAll(s));

  // Configurable image base via ?imgBase=URL (default: same folder)
  const url = new URL(location.href);
  const IMG_BASE = url.searchParams.get("imgBase") || "./";
  const CACHE_BUST = (typeof window.BUILD_TAG !== "undefined") ? `?v=${window.BUILD_TAG}` : "";

  const app = {
    state: {
      anchorId: null,     // e.g., "140000" or "140000.1"
      history: [],        // stack of visited anchors
      isOverlayOpen: false,
      touch: { x:0, y:0, t:0, active:false },
    },

    els: {
      anchorCard: qs("#anchorCard"),
      anchorImg: qs("#anchorImg"),
      anchorName: qs("#anchorName"),
      startBtn: qs("#startBtn"),
      backBtn: qs("#backBtn"),
      overlay: qs("#overlay"),
      toast: qs("#toast"),
      stage: qs("#stage"),
    },

    init(){
      // Start button prompts for ID
      this.els.startBtn.addEventListener("click", () => {
        const val = (prompt("Enter starting ID (e.g., 100000, 140000, 240000):") || "").trim();
        if(!val) return;
        this.navigateTo(val, {pushHistory:false, replaceHash:true});
      });

      // Back button: close overlay if open, else go back in history
      this.els.backBtn.addEventListener("click", () => {
        if(this.state.isOverlayOpen){
          this.closeOverlay();
          return;
        }
        this.goBack();
      });

      // Long-press SoftEdit on anchor (hidden, no hints)
      this.setupSoftEdit();

      // Touch handling for stage (swipes)
      this.setupGestures();

      // If hash has an ID, use it
      const hashId = (location.hash || "").replace(/^#/, "").trim();
      if(hashId){
        this.navigateTo(hashId, {pushHistory:false, replaceHash:false});
      }
    },

    setupSoftEdit(){
      // Long-press (500ms) on anchor to edit label (stored in-memory for this test build)
      const card = this.els.anchorCard;
      let pressTimer = null;
      const start = (e)=>{
        clearTimeout(pressTimer);
        pressTimer = setTimeout(()=>{
          const currentName = this.els.anchorName.textContent || "";
          const newName = prompt("Edit label (first name):", currentName);
          if(newName !== null){
            this.setName(this.state.anchorId, newName);
            this.renderAnchor();
          }
        }, 600);
      };
      const cancel = ()=> clearTimeout(pressTimer);
      card.addEventListener("touchstart", start, {passive:true});
      card.addEventListener("touchend", cancel);
      card.addEventListener("touchmove", cancel);
      card.addEventListener("mousedown", start);
      card.addEventListener("mouseup", cancel);
      card.addEventListener("mouseleave", cancel);
    },

    setupGestures(){
      const stage = this.els.stage;
      const touch = this.state.touch;
      const thresh = 40; // px

      const onStart = (x,y)=>{
        touch.active = true;
        touch.x = x; touch.y = y; touch.t = Date.now();
      };
      const onEnd = (x,y)=>{
        if(!touch.active) return;
        const dx = x - touch.x;
        const dy = y - touch.y;
        touch.active = false;
        if(Math.abs(dx) < thresh && Math.abs(dy) < thresh) return;

        if(Math.abs(dx) > Math.abs(dy)){
          if(dx > 0) this.onSwipeRight();
          else this.onSwipeLeft();
        } else {
          if(dy < 0) this.onSwipeUp();
          else this.onSwipeDown();
        }
      };

      // Touch
      stage.addEventListener("touchstart", (e)=>{
        const t = e.changedTouches[0];
        onStart(t.clientX, t.clientY);
      }, {passive:true});
      stage.addEventListener("touchend", (e)=>{
        const t = e.changedTouches[0];
        onEnd(t.clientX, t.clientY);
      });

      // Mouse (for desktop testing)
      let mouseDown = false;
      stage.addEventListener("mousedown", (e)=>{ mouseDown = true; onStart(e.clientX, e.clientY); });
      stage.addEventListener("mouseup", (e)=>{ if(mouseDown){ mouseDown=false; onEnd(e.clientX, e.clientY); } });
    },

    // === Swipe handlers ===
    onSwipeRight(){
      // Toggle spouse: X <-> X.1 (bidirectional)
      if(!this.state.anchorId) return;
      const id = this.state.anchorId;
      const spouseId = this.toSpouseId(id);
      // Try spouse image; if not found, show toast
      this.imageExists(this.imageURL(spouseId)).then(exists=>{
        if(exists){
          this.navigateTo(spouseId);
        }else{
          this.toast("No spouse image found for this ID.");
        }
      });
    },
    onSwipeLeft(){
      this.toast("Siblings will appear here in the next build.");
    },
    onSwipeUp(){
      this.toast("Parents will appear here in the next build.");
    },
    onSwipeDown(){
      this.toast("Children will appear here in the next build.");
    },

    toSpouseId(id){
      // If already a spouse (ends with .1 or contains .1.), strip first '.1' segment
      if(id.includes(".1")){
        // Remove only the first occurrence of ".1"
        return id.replace(".1","");
      }
      // Else, add .1
      return id + ".1";
    },

    // === Navigation & rendering ===
    navigateTo(newId, opts={}){
      const { pushHistory=true, replaceHash=true } = opts;
      const prev = this.state.anchorId;
      if(pushHistory && prev) this.state.history.push(prev);
      this.state.anchorId = newId;
      if(replaceHash){
        try { history.replaceState(null, "", `#${newId}`); } catch {}
      } else {
        try { history.pushState(null, "", `#${newId}`); } catch {}
      }
      this.renderAnchor();
      this.closeOverlay();
    },

    goBack(){
      const last = this.state.history.pop();
      if(!last){ this.toast("Start to pick an anchor."); return; }
      this.navigateTo(last, {pushHistory:false, replaceHash:true});
    },

    setName(id, name){
      // In this spouse-only test build, keep labels in-memory per session
      this._names = this._names || {};
      this._names[id] = (name || "").trim();
    },
    getName(id){
      return (this._names && this._names[id]) || "";
    },

    renderAnchor(){
      const id = this.state.anchorId;
      const url = this.imageURL(id);
      this.els.anchorImg.src = url;
      this.els.anchorImg.alt = id;
      this.els.anchorName.textContent = this.getName(id) || "";
      // Brief highlight flash
      this.els.anchorCard.style.outlineColor = "rgba(255,255,255,.35)";
      setTimeout(()=>{ this.els.anchorCard.style.outlineColor = "rgba(255,255,255,.08)"; }, 250);
    },

    imageURL(id){
      // Images are flat file names like 140000.jpg or 140000.1.jpg
      return `${IMG_BASE}${id}.jpg${CACHE_BUST}`;
    },

    imageExists(src){
      return new Promise(res=>{
        const img = new Image();
        let done = false;
        const finish = (v)=>{ if(!done){ done=true; res(v); } };
        img.onload = ()=> finish(true);
        img.onerror = ()=> finish(false);
        img.src = src;
        // Fallback timeout
        setTimeout(()=> finish(false), 1200);
      });
    },

    openOverlay(contentEl){
      this.state.isOverlayOpen = true;
      this.els.overlay.innerHTML = "";
      this.els.overlay.appendChild(contentEl);
      this.els.overlay.classList.remove("hidden");
    },
    closeOverlay(){
      this.state.isOverlayOpen = false;
      this.els.overlay.classList.add("hidden");
      this.els.overlay.innerHTML = "";
    },

    toast(msg){
      const el = this.els.toast;
      el.textContent = msg;
      el.classList.remove("hidden");
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(()=> el.classList.add("hidden"), 1400);
    },
  };

  window.addEventListener("load", ()=> app.init());
})();
