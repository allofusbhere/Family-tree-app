/* SwipeTree Build 20250811b */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const IMAGE_BASE = (window.IMAGE_BASE_URL || "").trim();

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

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  function getQueryParam(name) {
    const m = new URLSearchParams(window.location.search).get(name);
    return m ? m.trim() : null;
  }
  function isBaseGeneration(id) {
    const s = String(id);
    return /^[1-9]0+$/.test(s);
  }

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
    const step = mag / 10 || 1000;
    return step;
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
    const base = IMAGE_BASE;
    const stem = isSpouse ? `${padId(id)}.1` : `${padId(id)}`;
    const exts = ["jpg","JPG","jpeg","JPEG","png","PNG"];
    const candidates = exts.map(ext => `${base}{stem}.${ext}`);
    return new Promise((resolve, reject) => {
      let i = 0;
      const tryNext = () => {
        if (i >= candidates.length) return reject(new Error("not found"));
        const url = candidates[i++];
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = tryNext;
        img.src = url;
      };
      tryNext();
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
    } catch { }
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
    } catch { }
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
      await loadPersonImageUrl(parent, true);
      const cell = await imgCell(parent, { label: `${parent}.1 (Parent 2)`, spouse: true });
      parentsGrid.appendChild(cell);
    } catch { }
  }

  async function renderChildren(id) {
    childrenGrid.innerHTML = "";
    for (const kid of childrenOf(id)) {
      const cell = await imgCell(kid, { label: `${kid} (Child)` });
      childrenGrid.appendChild(cell);
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

  async function tryShowSpouse(id) {
    if (spouseViewOf != null) { const original = spouseViewOf; spouseViewOf = null; pushHistory(anchorId); setAnchor(original); return; }
    try {
      const spouseUrl = await loadPersonImageUrl(anchorId, true);
      spouseViewOf = anchorId;
      anchorArea.innerHTML = "";
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.id = `${anchorId}.1`;
      const img = document.createElement("img");
      img.className = "person";
      img.alt = `${anchorId}.1 (spouse)`;
      img.src = spouseUrl;
      cell.appendChild(img);
      const cap = document.createElement("div");
      cap.className = "label";
      cap.textContent = `${anchorId}.1`;
      cell.appendChild(cap);
      anchorArea.appendChild(cell);
    } catch { }
  }

  let tracking = false, startX = 0, startY = 0, dx = 0, dy = 0;
  const SWIPE_THRESHOLD = 50;

  function onPointerDown(e) { tracking = true; startX = e.clientX; startY = e.clientY; dx = dy = 0; }
  function onPointerMove(e) { if (!tracking) return; dx = e.clientX - startX; dy = e.clientY - startY; }
  function onPointerUp(e) {
    if (!tracking) return;
    tracking = false;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD) return;
    if (absX > absY) { if (dx > 0) tryShowSpouse(anchorId); else if (spouseViewOf != null) { const o = spouseViewOf; spouseViewOf = null; pushHistory(anchorId); setAnchor(o); } }
    else { if (dy < 0) renderParents(anchorId); else renderChildren(anchorId); }
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
    const numeric = Number(v.replace(".1",""));
    setAnchor(numeric);
  });
  startInput.addEventListener("keydown", (e) => { if (e.key === "Enter") confirmStart.click(); if (e.key === "Escape") cancelStart.click(); });

  window.addEventListener("load", () => {
    const startParam = getQueryParam("start");
    if (startParam && /^\d+(\.1)?$/.test(startParam)) { setAnchor(Number(String(startParam).replace(".1",""))); return; }
    setTimeout(() => startBtn.click(), 50);
  });
})();