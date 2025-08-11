/* SwipeTree Build 20250811b (root drop-in) — JPG-only, safe IMAGE_BASE fallback */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  // Fallback to CDN if the inline IMAGE_BASE_URL is missing/blocked
  const IMAGE_BASE = (typeof window !== "undefined" && (window.IMAGE_BASE_URL || "").trim())
    || "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";

  const stage = $("#stage");
  const parentsGrid = $("#parentsGrid");
  const childrenGrid = $("#childrenGrid");
  const anchorArea = $("#anchorArea");
  const backBtn = $("#backBtn");
  const startBtn = $("#startBtn");
  const promptModal = $("#promptModal");
  const startInput = $("#startInput");
  const confirmStart = $("#confirmStart");
  const cancelStart = $("#cancelStart");

  const historyStack = [];
  let anchorId = null;
  let spouseViewOf = null;

  function getQueryParam(name) {
    const m = new URLSearchParams(window.location.search).get(name);
    return m ? m.trim() : null;
  }

  function isBaseGeneration(id) { return /^[1-9]0+$/.test(String(id)); }
  function padId(x) { return String(x); }
  function rightmostNonZeroMagnitude(n) {
    let s = padId(n);
    for (let i = s.length - 1; i >= 0; i--) {
      if (s[i] !== "0") {
        const posFromRight = s.length - 1 - i;
        return Math.pow(10, posFromRight);
      }
    }
    return 0;
  }
  function parentIdOf(id) {
    id = Number(id);
    const mag = rightmostNonZeroMagnitude(id);
    if (mag === 0) return null;
    const divisor = mag * 10;
    const parent = id - (id % divisor);
    return parent || null;
  }
  function childStepOf(id) {
    id = Number(id);
    const mag = rightmostNonZeroMagnitude(id);
    return mag / 10 || 1000;
  }
  function childrenOf(id, max = 9) {
    const base = Number(id);
    const step = childStepOf(base);
    const divisor = step * 10;
    const parentBase = base - (base % divisor);
    const kids = [];
    for (let k = 1; k <= max; k++) kids.push(parentBase + k * step);
    return kids;
  }

  async function loadPersonImageUrl(id, isSpouse = false) {
    const stem = isSpouse ? `${padId(id)}.1` : `${padId(id)}`;
    const url = `${IMAGE_BASE}${stem}.jpg`;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject(new Error("not found: " + url));
      img.src = url;
    });
  }

  async function imgCell(id, opts = {}) {
    const { label = null, spouse = false } = opts;
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.id = String(id);
    try {
      const url = await loadPersonImageUrl(id, spouse);
      const img = document.createElement("img");
      img.className = "person";
      img.alt = `${id}${spouse ? " (spouse)" : ""}`;
      img.src = url;
      cell.appendChild(img);
    } catch (err) {
      console.warn(err.message);
    }
    const cap = document.createElement("div");
    cap.className = "label";
    cap.textContent = label ?? String(id);
    cell.appendChild(cap);

    cell.addEventListener("pointerdown", () => cell.classList.add("tapped"));
    cell.addEventListener("pointerup", () => cell.classList.remove("tapped"));
    cell.addEventListener("pointercancel", () => cell.classList.remove("tapped"));
    cell.addEventListener("click", () => { pushHistory(anchorId); spouseViewOf = null; setAnchor(id); });
    return cell;
  }

  async function renderAnchor(id) {
    anchorArea.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "cell";
    wrap.dataset.id = String(id);
    try {
      const url = await loadPersonImageUrl(id, false);
      const img = document.createElement("img");
      img.className = "person";
      img.alt = String(id);
      img.src = url;
      wrap.appendChild(img);
    } catch (err) {
      console.warn(err.message);
    }
    const cap = document.createElement("div");
    cap.className = "label";
    cap.textContent = String(id);
    wrap.appendChild(cap);
    anchorArea.appendChild(wrap);
  }

  async function renderParents(id) {
    parentsGrid.innerHTML = "";
    if (isBaseGeneration(id)) return;
    const parent = parentIdOf(id);
    if (!parent) return;
    parentsGrid.appendChild(await imgCell(parent, { label: `${parent} (Parent)` }));
    try {
      parentsGrid.appendChild(await imgCell(parent, { label: `${parent}.1 (Parent 2)`, spouse: true }));
    } catch (err) { console.warn(err.message); }
  }

  async function renderChildren(id) {
    childrenGrid.innerHTML = "";
    for (const kid of childrenOf(id)) {
      childrenGrid.appendChild(await imgCell(kid, { label: `${kid} (Child)` }));
    }
  }

  async function setAnchor(id) {
    anchorId = Number(id);
    await renderAnchor(anchorId);
    await renderParents(anchorId);
    await renderChildren(anchorId);
    spouseViewOf = null;
  }
  function pushHistory(id) { if (id != null) historyStack.push(id); }
  function goBack() { if (!historyStack.length) return; const prev = historyStack.pop(); spouseViewOf = null; setAnchor(prev); }

  async function tryShowSpouse() {
    if (spouseViewOf != null) {
      const o = spouseViewOf;
      spouseViewOf = null;
      pushHistory(anchorId);
      setAnchor(o);
      return;
    }
    try {
      await loadPersonImageUrl(anchorId, true);
      anchorArea.innerHTML = "";
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.id = `${anchorId}.1`;
      const img = document.createElement("img");
      img.className = "person";
      img.alt = `${anchorId}.1 (spouse)`;
      img.src = `${IMAGE_BASE}${anchorId}.1.jpg`;
      cell.appendChild(img);
      const cap = document.createElement("div");
      cap.className = "label";
      cap.textContent = `${anchorId}.1`;
      cell.appendChild(cap);
      anchorArea.appendChild(cell);
    } catch (err) { console.warn(err.message); }
  }

  let tracking = false, startX = 0, startY = 0, dx = 0, dy = 0;
  const SWIPE_THRESHOLD = 50;
  function onPointerDown(e) { tracking = true; startX = e.clientX; startY = e.clientY; dx = dy = 0; }
  function onPointerMove(e) { if (!tracking) return; dx = e.clientX - startX; dy = e.clientY - startY; }
  function onPointerUp(e) {
    if (!tracking) return;
    tracking = false;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax < SWIPE_THRESHOLD && ay < SWIPE_THRESHOLD) return;
    if (ax > ay) {
      if (dx > 0) tryShowSpouse();
      else if (spouseViewOf != null) { const o = spouseViewOf; spouseViewOf = null; pushHistory(anchorId); setAnchor(o); }
    } else {
      if (dy < 0) renderParents(anchorId);
      else renderChildren(anchorId);
    }
  }
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", () => { tracking = false; });
  backBtn.addEventListener("click", goBack);

  startBtn.addEventListener("click", () => { promptModal.classList.remove("hidden"); startInput.value = ""; startInput.focus(); });
  cancelStart.addEventListener("click", () => promptModal.classList.add("hidden"));
  confirmStart.addEventListener("click", () => {
    const v = startInput.value.trim();
    if (!/^\d+(\.1)?$/.test(v)) { startInput.focus(); return; }
    promptModal.classList.add("hidden");
    pushHistory(anchorId);
    spouseViewOf = null;
    setAnchor(Number(v.replace(".1","")));
  });
  startInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmStart.click();
    if (e.key === "Escape") cancelStart.click();
  });

  window.addEventListener("load", () => {
    const startParam = getQueryParam("start");
    const startId = (startParam && /^\d+(\.1)?$/.test(startParam))
      ? Number(String(startParam).replace(".1",""))
      : 100000;
    setAnchor(startId);
  });
})();