
// SwipeTree — Spouse + Tap-to-Enter-Branch
(function(){
  const qs = (s, el=document)=> el.querySelector(s);

  const url = new URL(location.href);
  const IMG_BASE = url.searchParams.get("imgBase") || "./";
  const CACHE_BUST = (typeof window.BUILD_TAG !== "undefined") ? `?v=${window.BUILD_TAG}` : "";

  const app = {
    state: {
      anchorId: null,
      history: [],
      isOverlayOpen: false,
      touch: { x:0, y:0, active:false },
      spouseMap: {}, // {"140000":"240000","240000":"140000"}
      suppressTap: false,
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

    async init(){
      this.els.startBtn.addEventListener("click", () => {
        const val = (prompt("Enter starting ID (e.g., 100000, 140000, 240000):") || "").trim();
        if(!val) return;
        this.navigateTo(val, {pushHistory:false, replaceHash:true});
      });
      this.els.backBtn.addEventListener("click", () => {
        if(this.state.isOverlayOpen){ this.closeOverlay(); return; }
        this.goBack();
      });

      this.setupSoftEdit();
      this.setupGestures();
      this.setupTapToEnterBranch();

      // Load optional spouse_links.json
      try {
        const resp = await fetch(`spouse_links.json${CACHE_BUST}`, {cache:"no-store"});
        if(resp.ok){
          const data = await resp.json();
          if(data && typeof data === "object") this.state.spouseMap = data;
        }
      } catch(e){ /* optional */ }

      const hashId = (location.hash || "").replace(/^#/, "").trim();
      if(hashId){ this.navigateTo(hashId, {pushHistory:false, replaceHash:false}); }
    },

    setupSoftEdit(){
      const card = this.els.anchorCard;
      let timer=null;
      const start = ()=>{
        clearTimeout(timer);
        timer = setTimeout(()=>{
          this.state.suppressTap = true; // prevent tap after long-press
          const current = this.els.anchorName.textContent || "";
          const name = prompt("Edit label (first name):", current);
          if(name!==null){ this.setName(this.state.anchorId, name); this.renderAnchor(); }
          setTimeout(()=> this.state.suppressTap=false, 10);
        }, 600);
      };
      const cancel = ()=> clearTimeout(timer);
      card.addEventListener("touchstart", start, {passive:true});
      card.addEventListener("touchend", cancel);
      card.addEventListener("touchmove", cancel);
      card.addEventListener("mousedown", start);
      card.addEventListener("mouseup", cancel);
      card.addEventListener("mouseleave", cancel);
    },

    setupGestures(){
      const stage = this.els.stage;
      const thresh = 40;
      let startX=0, startY=0, down=false;
      const onStart = (x,y)=>{ down=true; startX=x; startY=y; };
      const onEnd = (x,y)=>{
        if(!down) return;
        down=false;
        const dx=x-startX, dy=y-startY;
        if(Math.abs(dx)<thresh && Math.abs(dy)<thresh) return;
        if(Math.abs(dx)>Math.abs(dy)){
          if(dx>0) this.onSwipeRight();
          else this.toast("Left swipe reserved for siblings (next build).");
        }else{
          if(dy<0) this.toast("Up swipe reserved for parents (next build).");
          else this.toast("Down swipe reserved for children (next build).");
        }
      };
      stage.addEventListener("touchstart", e=>{
        const t=e.changedTouches[0]; onStart(t.clientX,t.clientY);
      }, {passive:true});
      stage.addEventListener("touchend", e=>{
        const t=e.changedTouches[0]; onEnd(t.clientX,t.clientY);
      });
      stage.addEventListener("mousedown", e=> onStart(e.clientX,e.clientY));
      stage.addEventListener("mouseup", e=> onEnd(e.clientX,e.clientY));
    },

    setupTapToEnterBranch(){
      // Tap on the spouse image (.1) to enter mapped branch if one exists
      this.els.anchorCard.addEventListener("click", ()=>{
        if(this.state.suppressTap) return; // skip tap right after long-press
        const id = this.state.anchorId || "";
        if(!id.includes(".1")) return; // only act when viewing spouse image
        const mainId = id.replace(".1","");
        const partnerId = this.state.spouseMap[mainId];
        if(partnerId){
          this.navigateTo(partnerId);
        }else{
          this.toast("No mapped branch for this spouse.");
        }
      });
    },

    // === Swipe handlers ===
    async onSwipeRight(){
      const id = this.state.anchorId;
      if(!id) return;
      const isSpouse = id.includes(".1");
      const mainId = isSpouse ? id.replace(".1","") : id;

      if(!isSpouse){
        // MAIN -> show spouse face if exists, else toast
        const spouseId = `${mainId}.1`;
        if(await this.imageExists(this.imageURL(spouseId))){
          this.navigateTo(spouseId);
        }else{
          this.toast("No spouse image found for this ID.");
        }
      } else {
        // SPOUSE face -> toggle back to main on right swipe
        this.navigateTo(mainId);
      }
    },

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
      this._names = this._names || {};
      this._names[id] = (name || "").trim();
    },
    getName(id){
      return (this._names && this._names[id]) || "";
    },

    renderAnchor(){
      const id = this.state.anchorId;
      this.els.anchorImg.src = this.imageURL(id);
      this.els.anchorImg.alt = id;
      this.els.anchorName.textContent = this.getName(id) || "";
      this.els.anchorCard.style.outlineColor = "rgba(255,255,255,.35)";
      setTimeout(()=> this.els.anchorCard.style.outlineColor = "rgba(255,255,255,.08)", 250);
    },

    imageURL(id){ return `${IMG_BASE}${id}.jpg${CACHE_BUST}`; },
    imageExists(src){
      return new Promise(res=>{
        const img = new Image();
        let done=false;
        const finish=v=>{ if(!done){ done=true; res(v);} };
        img.onload = ()=> finish(true);
        img.onerror = ()=> finish(false);
        img.src = src;
        setTimeout(()=> finish(false), 1200);
      });
    },

    openOverlay(el){ this.state.isOverlayOpen=true; this.els.overlay.innerHTML=""; this.els.overlay.appendChild(el); this.els.overlay.classList.remove("hidden"); },
    closeOverlay(){ this.state.isOverlayOpen=false; this.els.overlay.classList.add("hidden"); this.els.overlay.innerHTML=""; },
    toast(msg){ const el=this.els.toast; el.textContent=msg; el.classList.remove("hidden"); clearTimeout(this._t); this._t=setTimeout(()=>el.classList.add("hidden"), 1400); },
  };

  window.addEventListener("load", ()=> app.init());
})();
