
/*! softedit.js v1.3 (scoped, load-safe) */
(function () {
  // Wait for full paint so Safari has images ready
  window.addEventListener("load", function () {
    try { initSoftEdit(); } catch (e) { console.error("softedit init failed", e); }
  });

  function initSoftEdit() {
    // Inject minimal CSS (scoped) + iOS callout off
    const css = `
      .se-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999}
      .se-card{width:min(520px,92vw);background:#111;border:1px solid #333;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.4);padding:18px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#fafafa}
      .se-card h3{margin:0 0 12px 0;font-weight:600;font-size:18px}
      .se-row{display:flex;flex-direction:column;gap:8px;margin-top:10px}
      .se-input{all:unset;background:#191919;border:1px solid #2b2b2b;border-radius:10px;padding:10px 12px}
      .se-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
      .se-btn{all:unset;cursor:pointer;padding:8px 12px;border-radius:10px;border:1px solid #2b2b2b}
      .se-btn.primary{background:#2d6cdf;border-color:#2d6cdf;color:white}
      .se-label-wrap{display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:10px;-webkit-touch-callout:none}
      .se-name{color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.6)}
      .se-dob{color:#cfcfcf;font-size:12px}
      img{-webkit-touch-callout:none}
    `;
    const style = document.createElement("style");
    style.id = "softedit-css";
    style.textContent = css;
    document.head.appendChild(style);

    // Find current person id from hash or input box (FTA keeps input#id box)
    let currentId = null;
    const hash = (location.hash || "").replace(/^#/, "");
    if (/^\d{5,}$/.test(hash)) currentId = hash;
    if (!currentId) {
      const idInput = document.querySelector('input[type="text"], input#id, input[name="id"]');
      if (idInput && /^\d{5,}$/.test(idInput.value)) currentId = idInput.value.trim();
    }
    // Helper to pick the main image: #anchorImage, then [data-anchor], else largest <img>
    function pickAnchorImage() {
      const direct = document.querySelector("#anchorImage, img[data-anchor='1'], img[data-anchor='true']");
      if (direct) return direct;
      let maxArea = 0, best = null;
      document.querySelectorAll("img").forEach(img => {
        const a = (img.naturalWidth||0) * (img.naturalHeight||0);
        if (a > maxArea) { maxArea = a; best = img; }
      });
      return best;
    }

    // Render labels (name + dob) under the image
    function ensureLabelUI(anchorImg, payload) {
      if (!anchorImg) return;
      let holder = document.getElementById("se-label-holder");
      if (!holder) {
        holder = document.createElement("div");
        holder.id = "se-label-holder";
        holder.className = "se-label-wrap";
        // place right after the image
        anchorImg.insertAdjacentElement("afterend", holder);
      }
      holder.innerHTML = "";
      if (payload && (payload.name || payload.dob)) {
        const nm = document.createElement("div");
        nm.className = "se-name";
        nm.textContent = payload.name || "";
        const db = document.createElement("div");
        db.className = "se-dob";
        db.textContent = payload.dob || "";
        holder.appendChild(nm);
        holder.appendChild(db);
      }
    }

    // Long-press detector (no conflict with normal click)
    function attachLongPress(el, handler, ms=500) {
      let t=null, pressed=false;
      function start(e){ pressed=true; t=setTimeout(()=>{ handler(e); }, ms); }
      function cancel(){ pressed=false; if(t) clearTimeout(t); t=null; }
      el.addEventListener("touchstart", start, {passive:true});
      el.addEventListener("touchend", cancel);
      el.addEventListener("touchcancel", cancel);
      el.addEventListener("mousedown", e=>{ t=setTimeout(()=>handler(e), ms); });
      el.addEventListener("mouseup", ()=>{ if(t) { clearTimeout(t); t=null; } });
      el.addEventListener("mouseleave", ()=>{ if(t) { clearTimeout(t); t=null; } });
    }

    // Fetch wrapper to Netlify function (cache-busted)
    async function getLabel(id) {
      const ts = Date.now();
      const url = `/.netlify/functions/labels?id=${encodeURIComponent(id)}&ts=${ts}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("GET labels failed");
      return await res.json();
    }
    async function saveLabel(id, name, dob) {
      const ts = Date.now();
      const url = `/.netlify/functions/labels?id=${encodeURIComponent(id)}&ts=${ts}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control":"no-store" },
        body: JSON.stringify({ id, name, dob })
      });
      if (!res.ok) throw new Error("POST labels failed");
      return await res.json();
    }

    // Modal
    function showEditModal(initial, onSave) {
      const back = document.createElement("div");
      back.className = "se-modal-backdrop";
      const card = document.createElement("div");
      card.className = "se-card";
      card.innerHTML = `
        <h3>Edit Label</h3>
        <div class="se-row">
          <label>Name</label>
          <input class="se-input" id="se-name" placeholder="Full name" value="${(initial.name||"").replace(/"/g,'&quot;')}">
        </div>
        <div class="se-row">
          <label>DOB</label>
          <input class="se-input" id="se-dob" placeholder="YYYY-MM-DD" value="${(initial.dob||"").replace(/"/g,'&quot;')}">
        </div>
        <div class="se-actions">
          <button class="se-btn" id="se-cancel">Cancel</button>
          <button class="se-btn primary" id="se-save">Save</button>
        </div>
      `;
      back.appendChild(card);
      document.body.appendChild(back);
      function close(){ back.remove(); }
      back.addEventListener("click", (e)=>{ if(e.target===back) close(); });
      card.querySelector("#se-cancel").addEventListener("click", close);
      card.querySelector("#se-save").addEventListener("click", ()=>{
        const name = card.querySelector("#se-name").value.trim();
        const dob  = card.querySelector("#se-dob").value.trim();
        onSave({name, dob}).finally(close);
      });
    }

    // Boot sequence (after load)
    const anchor = pickAnchorImage();
    if (!anchor) { console.warn("softedit: no image anchor found"); return; }

    // Prefill render (ignore errors)
    if (currentId) {
      getLabel(currentId).then(data=>{
        ensureLabelUI(anchor, data);
      }).catch(()=>{});
    }

    // Attach long-press to open modal
    attachLongPress(anchor, function () {
      if (!currentId) {
        // try to re-detect at the time of press
        const hash2=(location.hash||"").replace(/^#/, "");
        if (/^\d{5,}$/.test(hash2)) currentId = hash2;
      }
      if (!currentId) { alert("No person id in URL hash."); return; }

      // fetch latest to prefill
      getLabel(currentId).then(latest=>{
        showEditModal(latest||{}, async ({name, dob}) => {
          await saveLabel(currentId, name, dob);
          const fresh = await getLabel(currentId);
          ensureLabelUI(anchor, fresh);
        });
      }).catch(()=>{
        showEditModal({name:"",dob:""}, async ({name, dob}) => {
          await saveLabel(currentId, name, dob);
          const fresh = await getLabel(currentId);
          ensureLabelUI(anchor, fresh);
        });
      });
    });
  }
})();
