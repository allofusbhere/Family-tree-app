
// SwipeTree — Spouse Tap-to-Enter Branch + Parents on Up Swipe
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
      spouseMap: {},
      suppressTap: false,
    },
    els: {
      anchorCard: qs("#anchorCard"),
      anchorImg: qs("#anchorImg"),
      anchorName: qs("#anchorName"),
      anchorIdTag: qs("#anchorIdTag"),
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

      // Load mapping
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
          this.state.suppressTap = true;
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
          if(dy<0) this.onSwipeUp();
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
      this.els.anchorCard.addEventListener("click", ()=>{
        if(this.state.suppressTap) return;
        const id = this.state.anchorId || "";
        if(!id.includes(".1")) return;
        const mainId = id.replace(".1","");
        const partnerId = this.state.spouseMap[mainId];
        if(partnerId){
          this.toast(`Entering spouse branch: ${partnerId}`);
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
        const spouseId = `${mainId}.1`;
        if(await this.imageExists(this.imageURL(spouseId))){
          this.navigateTo(spouseId);
        }else{
          this.toast("No spouse image found for this ID.");
        }
      } else {
        this.navigateTo(mainId);
      }
    },

    async onSwipeUp(){
      const id = this.state.anchorId;
      if(!id) return;
      if(id.includes(".1")){
        this.toast("Parents from spouse face not supported; swipe back to main first.");
        return;
      }
      const parentA = this.computeParent(id);
      if(!parentA){
        this.toast("No parent computed for this ID.");
        return;
      }

      const cards = [];
      const c1 = await this.makeParentCard(parentA, "Parent A");
      if(c1) cards.push(c1);
      const parentB = `${parentA}.1`;
      const c2 = await this.makeParentCard(parentB, "Parent B");
      if(c2) cards.push(c2);

      if(cards.length===0){
        this.toast("No parent images found.");
        return;
      }
      const grid = document.createElement("div");
      grid.className = "grid";
      cards.forEach(c=> grid.appendChild(c));
      this.openOverlay(grid);
    },

    async makeParentCard(pid, label){
      const src = this.imageURL(pid);
      const exists = await this.imageExists(src);
      if(!exists) return null;
      const card = document.createElement("div");
      card.className = "pCard";
      const img = document.createElement("img");
      img.src = src; img.alt = pid;
      const cap = document.createElement("div");
      cap.className = "pLabel"; cap.textContent = `${label} (${pid})`;
      card.appendChild(img); card.appendChild(cap);
      card.addEventListener("click", ()=> this.navigateTo(pid));
      return card;
    },

    computeParent(id){
      // Normalize
      id = id.replace(".1","");
      if(!/^\d+$/.test(id)) return null;
      const len = id.length;
      const n = parseInt(id,10);
      const thousands = Math.floor(n/1000)%10;
      const tenThousands = Math.floor(n/10000)%10;
      if(thousands>0){
        const parent = n - thousands*1000;
        return String(parent).padStart(len,"0");
      }else if(tenThousands>0){
        const parent = n - tenThousands*10000;
        return String(parent).padStart(len,"0");
      }
      return null; // top branch
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
      this.els.anchorIdTag.textContent = id;
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
