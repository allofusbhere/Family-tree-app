(function () {
  // ===== Config =====
  const BASE_IMAGE_URL = "https://allofusbhere.github.io/family-tree-images/";
  const PLACEHOLDER_IMAGE = BASE_IMAGE_URL + "placeholder.jpg";
  const isGitHubPages = location.hostname.endsWith("github.io");
  const LABELS_ENDPOINT = isGitHubPages ? null : "/.netlify/functions/labels";

  // ===== State =====
  let anchorId = "100000";
  let historyStack = [];
  let isOverlayOpen = false;
  let spouseMap = {};
  let labelsCache = {};

  // ===== Elements =====
  const el = {
    anchorImg: document.getElementById("anchorImg"),
    anchorName: document.getElementById("anchorName"),
    anchorId: document.getElementById("anchorId"),
    anchorWrap: document.getElementById("anchorWrap"),
    overlay: document.getElementById("overlay"),
    overlayTitle: document.getElementById("overlayTitle"),
    grid: document.getElementById("grid"),
    closeOverlayBtn: document.getElementById("closeOverlayBtn"),
    backBtn: document.getElementById("backBtn"),
    idInput: document.getElementById("idInput"),
    startBtn: document.getElementById("startBtn"),
    stage: document.getElementById("stage"),
  };

  // ===== Utilities =====
  function imgUrlFor(id) { return BASE_IMAGE_URL + id + ".jpg"; }
  function setAnchor(id, pushHistory = true) {
    if (!id || typeof id !== "string") return;
    if (pushHistory && anchorId && anchorId !== id) historyStack.push(anchorId);
    anchorId = String(id).trim();
    updateAnchorView();
    closeOverlay();
    updateHash();
  }
  function updateHash() {
    try {
      const v = new URLSearchParams(window.location.search).get("v") || "v";
      const url = `${location.origin}${location.pathname}?v=${encodeURIComponent(v)}#id=${anchorId}`;
      history.replaceState(null, "", url);
    } catch {}
  }
  function loadImage(imgEl, id) {
    return new Promise((resolve) => {
      const src = imgUrlFor(id);
      imgEl.onerror = () => { imgEl.src = PLACEHOLDER_IMAGE; resolve(false); };
      imgEl.onload = () => resolve(true);
      imgEl.src = src;
    });
  }

  // ===== Labels (skip fetch on GitHub Pages) =====
  async function fetchLabels() {
    try {
      if (LABELS_ENDPOINT) {
        const res = await fetch(LABELS_ENDPOINT, { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === "object") labelsCache = data;
        }
      }
    } catch {}
    // Always try local fallback
    try {
      const local = localStorage.getItem("swipetree_labels");
      if (local) labelsCache = { ...labelsCache, ...(JSON.parse(local) || {}) };
    } catch {}
  }
  function getName(id) { return labelsCache[id] || ""; }
  function setName(id, name) {
    labelsCache[id] = name;
    try { localStorage.setItem("swipetree_labels", JSON.stringify(labelsCache)); } catch {}
  }

  // ===== Spouse map =====
  async function fetchSpouseMap() {
    try {
      const res = await fetch("spouse_link.json", { cache: "no-store" });
      if (res.ok) {
        const map = await res.json();
        if (map && typeof map === "object") {
          spouseMap = { ...map };
          // symmetry
          Object.entries({ ...spouseMap }).forEach(([a, b]) => {
            spouseMap[a] = b; spouseMap[b] = a;
          });
        }
      }
    } catch {}
  }

  // ===== Relationship math =====
  function digits(id) {
    const base = String(id).split(".")[0];
    const s = base.padStart(6, "0").slice(-6);
    return s.split("").map((d) => parseInt(d, 10));
  }
  function toId(digs) { return digs.join(""); }
  function computeSiblings(id) {
    const d = digits(id);
    const pos = d.findIndex((x) => x !== 0);
    if (pos === -1) return [];
    const sibs = [];
    for (let v = 1; v <= 9; v++) {
      if (v === d[pos]) continue;
      const out = d.slice();
      out[pos] = v;
      for (let i = pos + 1; i < 6; i++) out[i] = 0;
      sibs.push(toId(out));
    }
    return Array.from(new Set(sibs));
  }
  function computedParent(id) {
    const d = digits(id);
    if (d[1] === 0 && d[2] === 0 && d[3] === 0 && d[4] === 0 && d[5] === 0) return null;
    const out = d.slice();
    if (d[1] !== 0) out[1] = 0;
    else if (d[2] !== 0) out[2] = 0;
    else if (d[3] !== 0) out[3] = 0;
    else if (d[4] !== 0) out[4] = 0;
    else if (d[5] !== 0) out[5] = 0;
    else return null;
    return toId(out);
  }
  function computeChildren(id) {
    const d = digits(id);
    const highest = d.findIndex((x) => x !== 0);
    const childPos = highest + 1;
    if (childPos > 5) return [];
    const out = [];
    for (let v = 1; v <= 9; v++) {
      const dd = d.slice();
      dd[childPos] = v;
      for (let i = childPos + 1; i < 6; i++) dd[i] = 0;
      out.push(toId(dd));
    }
    return Array.from(new Set(out));
  }

  // ===== Rendering =====
  async function updateAnchorView() {
    el.anchorId.textContent = anchorId;
    el.anchorName.textContent = getName(anchorId) || "\\u00A0";
    await loadImage(el.anchorImg, anchorId);
  }
  function openOverlay(title, tiles) {
    // Guard: always have a meaningful title and at least a placeholder tile
    const safeTitle = title || "Info";
    const safeTiles = (tiles && tiles.length ? tiles : [{ id: "No data", placeholder: true, imgId: "placeholder" }]);
    el.overlayTitle.textContent = safeTitle;
    el.grid.innerHTML = "";
    safeTiles.forEach((t) => {
      const div = document.createElement("div");
      div.className = "tile" + (t.placeholder ? " placeholder" : "");
      div.dataset.id = t.id || "";
      const imgwrap = document.createElement("div"); imgwrap.className = "imgwrap";
      const img = document.createElement("img");
      img.loading = "lazy"; img.src = BASE_IMAGE_URL + (t.imgId || t.id) + ".jpg";
      img.onerror = () => (img.src = PLACEHOLDER_IMAGE);
      imgwrap.appendChild(img);
      const meta = document.createElement("div"); meta.className = "meta";
      const name = document.createElement("div"); name.className = "name"; name.textContent = t.name || "";
      const id = document.createElement("div"); id.className = "id"; id.textContent = t.id || "";
      meta.appendChild(name); meta.appendChild(id);
      div.appendChild(imgwrap); div.appendChild(meta);
      if (!t.placeholder) { div.addEventListener("click", () => setAnchor(t.navigateTo || t.id)); }
      el.grid.appendChild(div);
    });
    el.overlay.classList.remove("hidden");
    isOverlayOpen = true;
  }
  function closeOverlay() {
    isOverlayOpen = false;
    el.overlay.classList.add("hidden");
  }

  // ===== Gesture handling =====
  let touchStartX = 0, touchStartY = 0;
  const SWIPE_THRESHOLD = 40;
  function onTouchStart(e) {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    const t = e.changedTouches[0];
    touchStartX = t.clientX; touchStartY = t.clientY;
  }
  function onTouchEnd(e) {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) handleSwipe("right"); else handleSwipe("left");
    } else {
      if (dy < 0) handleSwipe("up"); else handleSwipe("down");
    }
  }
  async function handleSwipe(dir) {
    if (dir === "right") {
      const tiles = await buildSpouseTiles(anchorId);
      openOverlay("Spouse", tiles);
    } else if (dir === "left") {
      const sibs = computeSiblings(anchorId).map(id => ({ id, imgId: id, name: getName(id) }));
      openOverlay("Siblings", sibs);
    } else if (dir === "up") {
      const p1 = computedParent(anchorId);
      const tiles = [];
      if (p1) tiles.push({ id: p1, imgId: p1, name: getName(p1) });
      tiles.push({ id: "Parent2 (placeholder)", placeholder: true, imgId: "placeholder" });
      openOverlay("Parents", tiles);
    } else if (dir === "down") {
      const kids = computeChildren(anchorId).map(id => ({ id, imgId: id, name: getName(id) }));
      openOverlay("Children", kids);
    }
  }
  async function buildSpouseTiles(id) {
    const base = String(id).split(".")[0];
    const tiles = [];
    const partner = spouseMap[base];
    if (partner) {
      tiles.push({ id: partner, imgId: partner + ".1", name: getName(partner) || "Spouse", navigateTo: partner });
    } else {
      tiles.push({ id: base + ".1", imgId: base + ".1", name: "Spouse (.1)", navigateTo: base });
    }
    return tiles;
  }

  // ===== SoftEdit (long-press) =====
  let pressTimer = null;
  el.anchorWrap.addEventListener("touchstart", () => {
    pressTimer = setTimeout(() => {
      const current = getName(anchorId) || "";
      const next = prompt("Edit name", current);
      if (typeof next === "string") { setName(anchorId, next.trim()); updateAnchorView(); }
    }, 600);
  });
  el.anchorWrap.addEventListener("touchend", () => clearTimeout(pressTimer));
  el.anchorWrap.addEventListener("touchmove", () => clearTimeout(pressTimer));

  // ===== Buttons =====
  el.closeOverlayBtn.addEventListener("click", closeOverlay);
  el.backBtn.addEventListener("click", () => {
    if (isOverlayOpen) { closeOverlay(); return; }
    const prev = historyStack.pop();
    if (prev) setAnchor(prev, false);
  });
  el.startBtn.addEventListener("click", () => {
    const v = String(el.idInput.value || "").trim();
    if (/^\d{6}(?:\.\d+)?$/.test(v)) setAnchor(v);
  });

  // ===== Stage gestures =====
  el.stage.addEventListener("touchstart", onTouchStart, { passive: true });
  el.stage.addEventListener("touchend", onTouchEnd, { passive: true });

  // ===== Init =====
  async function init() {
    closeOverlay(); // ensure hidden on load
    await Promise.all([fetchLabels(), fetchSpouseMap()]);
    const hash = new URLSearchParams(location.hash.slice(1));
    const idFromHash = hash.get("id");
    if (idFromHash) anchorId = String(idFromHash).trim();
    updateAnchorView();
  }
  document.addEventListener("DOMContentLoaded", init);
})();