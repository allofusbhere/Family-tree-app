/* SwipeTree — iPad build with swipes, spouse anchoring, and numeric logic.
 * Navigation:
 *   → (right)  : spouse
 *   ↑ (up)     : parents (shows computed Parent1, placeholder Parent2)
 *   ← (left)   : siblings
 *   ↓ (down)   : children
 *
 * Data rules (6-digit IDs, optional ".1" for spouse image files):
 *   - Children of 140000 are 141000..149000 (+1000 * n).
 *   - Siblings of 140000 are 110000..160000 (vary the ten‑thousands digit).
 *   - Parent of 140000 is 100000 (zero out ten‑thousands digit).
 *   - For 100000, siblings are 200000..900000 (vary the hundred‑thousands digit).
 * Images are loaded from BASE_IMAGE_URL + id + ".jpg".
 * Spouse linkage: spouse_link.json provides symmetric A<->B mapping.
 *   - Tapping spouse tile anchors on the partner base ID (e.g., 240000), not ".1".
 * Labels: tries Netlify function / .netlify/functions/labels first; falls back to localStorage.
 */

(function () {
  // ===== Config =====
  const BASE_IMAGE_URL =
    "https://allofusbhere.github.io/family-tree-images/"; // ends with /
  const PLACEHOLDER_IMAGE = BASE_IMAGE_URL + "placeholder.jpg";
  const LABELS_ENDPOINT = "/.netlify/functions/labels";

  // ===== State =====
  let anchorId = "100000";
  let historyStack = [];
  let isOverlayOpen = false;
  let spouseMap = {}; // { "140000": "240000", "240000": "140000" }
  let labelsCache = {}; // { "140000": "Aaron", ... }

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
  function imgUrlFor(id) {
    // strip .1 for image choice? No — actual files can exist as ".1.jpg" too.
    return BASE_IMAGE_URL + id + ".jpg";
  }
  function setAnchor(id, pushHistory = true) {
    if (!id || typeof id !== "string") return;
    if (pushHistory && anchorId && anchorId !== id) historyStack.push(anchorId);
    anchorId = normalizeId(id);
    updateAnchorView();
    closeOverlay();
    updateHash();
  }
  function updateHash() {
    try {
      const v = new URLSearchParams(window.location.search).get("v") || "v";
      const url = `${location.origin}${location.pathname}?v=${encodeURIComponent(
        v
      )}#id=${anchorId}`;
      history.replaceState(null, "", url);
    } catch {}
  }
  function normalizeId(id) {
    return String(id).trim();
  }
  function loadImage(imgEl, id) {
    return new Promise((resolve) => {
      const src = imgUrlFor(id);
      imgEl.onerror = () => {
        imgEl.src = PLACEHOLDER_IMAGE;
        resolve(false);
      };
      imgEl.onload = () => resolve(true);
      imgEl.src = src;
    });
  }

  // ===== Labels (Netlify first, then localStorage) =====
  async function fetchLabels() {
    try {
      const res = await fetch(LABELS_ENDPOINT, { method: "GET" });
      if (!res.ok) throw new Error("labels fetch failed");
      const data = await res.json();
      if (data && typeof data === "object") labelsCache = data;
    } catch {
      // local fallback
      const local = localStorage.getItem("swipetree_labels");
      if (local) {
        try {
          labelsCache = JSON.parse(local) || {};
        } catch {}
      }
    }
  }
  function getName(id) {
    return labelsCache[id] || "";
  }
  function setName(id, name) {
    if (!id) return;
    labelsCache[id] = name;
    try {
      localStorage.setItem("swipetree_labels", JSON.stringify(labelsCache));
    } catch {}
    // (No write‑back to Netlify in this build; read‑only hook)
  }

  // ===== Spouse map =====
  async function fetchSpouseMap() {
    try {
      const res = await fetch("spouse_link.json", { cache: "no-store" });
      if (res.ok) {
        const map = await res.json();
        if (map && typeof map === "object") spouseMap = map;
        // ensure symmetry
        Object.entries({ ...spouseMap }).forEach(([a, b]) => {
          spouseMap[a] = b;
          spouseMap[b] = a;
        });
      }
    } catch {}
  }

  // ===== Relationship math =====
  function digits(id) {
    // returns array of 6 digits ignoring any ".1" suffix
    const base = String(id).split(".")[0];
    const s = base.padStart(6, "0").slice(-6);
    return s.split("").map((d) => parseInt(d, 10));
  }
  function toId(digs) {
    return digs.join("");
  }
  function isSixDigitBase(id) {
    const base = String(id).split(".")[0];
    return /^\d{6}$/.test(base);
  }
  function computedParent(id) {
    const base = String(id).split(".")[0];
    if (!/^\d{6}$/.test(base)) return null;
    const d = digits(base);
    // Rule:
    // - If only d0 is non‑zero (e.g., 100000), there's no higher parent in this scheme.
    // - Else, zero out the next non‑zero position after the first.
    // For 140000 (1 4 0 0 0 0) -> parent 100000.
    if (d[1] === 0 && d[2] === 0 && d[3] === 0 && d[4] === 0 && d[5] === 0) {
      // Form X00000; cannot go higher
      if (d[0] !== 0) return null;
    }
    const out = d.slice();
    if (d[1] !== 0) {
      out[1] = 0;
    } else if (d[2] !== 0) {
      out[2] = 0;
    } else if (d[3] !== 0) {
      out[3] = 0;
    } else if (d[4] !== 0) {
      out[4] = 0;
    } else if (d[5] !== 0) {
      out[5] = 0;
    } else {
      return null;
    }
    return toId(out);
  }
  function computeSiblings(id) {
    const base = String(id).split(".")[0];
    if (!/^\d{6}$/.test(base)) return [];
    const d = digits(base);
    // Determine the highest non‑zero position (index 0..5). Vary that digit 1..9 (or 0..9?) sensibly.
    let pos = d.findIndex((x) => x !== 0);
    if (pos === -1) return [];
    // Vary this digit 1..9 except current; zero everything after pos.
    const sibs = [];
    for (let v = 1; v <= 9; v++) {
      if (v === d[pos]) continue;
      const out = d.slice();
      out[pos] = v;
      for (let i = pos + 1; i < 6; i++) out[i] = 0;
      sibs.push(toId(out));
    }
    return dedupe(sibs);
  }
  function computeChildren(id) {
    const base = String(id).split(".")[0];
    if (!/^\d{6}$/.test(base)) return [];
    const d = digits(base);
    // Children: modify thousands place (index 2) for 6‑digit scheme like 140000 -> 141000..149000
    // But if the highest non‑zero is earlier (e.g., 100000), children become 110000..190000
    // General rule: children vary the next lower place after the highest non‑zero digit.
    const highest = d.findIndex((x) => x !== 0);
    let childPos = highest + 1;
    if (childPos > 5) return [];
    const out = [];
    for (let v = 1; v <= 9; v++) {
      const dd = d.slice();
      dd[childPos] = v;
      for (let i = childPos + 1; i < 6; i++) dd[i] = 0;
      out.push(toId(dd));
    }
    return dedupe(out);
  }
  function dedupe(arr) {
    return Array.from(new Set(arr));
  }

  // ===== Rendering =====
  async function updateAnchorView() {
    el.anchorId.textContent = anchorId;
    el.anchorName.textContent = getName(anchorId) || "\u00A0";
    await loadImage(el.anchorImg, anchorId) /* fallbacks inside */;
  }

  function openOverlay(title, tiles) {
    isOverlayOpen = true;
    el.overlayTitle.textContent = title;
    el.grid.innerHTML = "";
    tiles.forEach((t) => {
      const div = document.createElement("div");
      div.className = "tile" + (t.placeholder ? " placeholder" : "");
      div.dataset.id = t.id || "";
      const imgwrap = document.createElement("div");
      imgwrap.className = "imgwrap";
      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = imgUrlFor(t.imgId || t.id);
      img.onerror = () => (img.src = PLACEHOLDER_IMAGE);
      imgwrap.appendChild(img);
      const meta = document.createElement("div");
      meta.className = "meta";
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = t.name || "";
      const id = document.createElement("div");
      id.className = "id";
      id.textContent = t.id || "";
      meta.appendChild(name);
      meta.appendChild(id);
      div.appendChild(imgwrap);
      div.appendChild(meta);
      if (!t.placeholder) {
        div.addEventListener("click", () => {
          setAnchor(t.navigateTo || t.id);
        });
      }
      el.grid.appendChild(div);
    });
    el.overlay.classList.remove("hidden");
  }
  function closeOverlay() {
    isOverlayOpen = false;
    el.overlay.classList.add("hidden");
  }

  // ===== Gesture handling =====
  let touchStartX = 0, touchStartY = 0, touchTime = 0;
  const SWIPE_THRESHOLD = 40;

  function onTouchStart(e) {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    const t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchTime = Date.now();
  }
  function onTouchEnd(e) {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    if (absX > absY) {
      if (dx > 0) handleSwipe("right"); else handleSwipe("left");
    } else {
      if (dy < 0) handleSwipe("up"); else handleSwipe("down");
    }
  }

  async function handleSwipe(dir) {
    if (dir === "right") {
      // SPOUSE
      const spouseTiles = await buildSpouseTiles(anchorId);
      if (spouseTiles.length === 0) {
        openOverlay("Spouse", [{ id: "No spouse linked", placeholder: true, imgId: "placeholder" }]);
      } else {
        openOverlay("Spouse", spouseTiles);
      }
    } else if (dir === "left") {
      // SIBLINGS
      const sibs = computeSiblings(anchorId);
      const tiles = sibs.map((id) => ({
        id,
        imgId: id,
        name: getName(id),
      }));
      openOverlay("Siblings", tiles);
    } else if (dir === "up") {
      // PARENTS (Parent1 + placeholder Parent2)
      const p1 = computedParent(anchorId);
      const tiles = [];
      if (p1) tiles.push({ id: p1, imgId: p1, name: getName(p1) });
      tiles.push({ id: "Parent2 (placeholder)", placeholder: true, imgId: "placeholder" });
      openOverlay("Parents", tiles);
    } else if (dir === "down") {
      // CHILDREN
      const kids = computeChildren(anchorId);
      const tiles = kids.map((id) => ({
        id,
        imgId: id,
        name: getName(id),
      }));
      openOverlay("Children", tiles);
    }
  }

  async function buildSpouseTiles(id) {
    const base = String(id).split(".")[0];
    const tiles = [];
    // Mapped partner via spouse_link.json (preferred)
    const partner = spouseMap[base];
    if (partner) {
      tiles.push({
        id: partner,
        imgId: partner + ".1", // show the partner's ".1" portrait file if present
        name: getName(partner) || "Spouse",
        navigateTo: partner,
      });
    } else {
      // Fallback: show ".1" of the current base; navigate stays on base (no tracing)
      tiles.push({
        id: base + ".1",
        imgId: base + ".1",
        name: "Spouse (.1)",
        navigateTo: base, // cannot trace without link
      });
    }
    return tiles;
  }

  // ===== SoftEdit (long‑press) on anchor =====
  let pressTimer = null;
  el.anchorWrap.addEventListener("touchstart", () => {
    pressTimer = setTimeout(() => {
      const current = getName(anchorId) || "";
      const next = prompt("Edit name", current);
      if (typeof next === "string") {
        setName(anchorId, next.trim());
        updateAnchorView();
      }
    }, 600);
  });
  el.anchorWrap.addEventListener("touchend", () => clearTimeout(pressTimer));
  el.anchorWrap.addEventListener("touchmove", () => clearTimeout(pressTimer));

  // ===== Buttons & overlay =====
  el.closeOverlayBtn.addEventListener("click", closeOverlay);
  el.backBtn.addEventListener("click", () => {
    if (isOverlayOpen) {
      closeOverlay();
      return;
    }
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
    await Promise.all([fetchLabels(), fetchSpouseMap()]);
    // Start from hash if present
    const hash = new URLSearchParams(location.hash.slice(1));
    const idFromHash = hash.get("id");
    if (idFromHash) anchorId = normalizeId(idFromHash);
    updateAnchorView();
  }

  document.addEventListener("DOMContentLoaded", init);
})();