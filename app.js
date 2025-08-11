/* SwipeTree iPad Test Build — 2025-08-11
 * Focus: center anchor, spouse swipe-back, working BACK, proper START input,
 * reliable up/down swipes, instant tap highlight.
 *
 * Images:
 *   - People: <ID>.jpg/.JPG/.jpeg (case tolerant loader)
 *   - Spouse: <ID>.1.jpg/.JPG/.jpeg
 */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const IMAGE_BASE = (window.IMAGE_BASE_URL || "").trim(); // must end with "/" if provided

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

  // History & state
  const historyStack = [];
  let anchorId = null;        // number or string
  let spouseViewOf = null;    // when showing spouse, remember whose spouse we are viewing

  // --- Utilities ------------------------------------------------------------

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  function padId(x) {
    return String(x);
  }

  function rightmostNonZeroMagnitude(n) {
    // Return magnitude (1,10,100,...) of rightmost non-zero digit
    let s = padId(n);
    for (let i = s.length - 1; i >= 0; i++) {
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
    // Children step is one digit lower than the rightmost non-zero digit
    id = Number(id);
    const mag = rightmostNonZeroMagnitude(id);
    const step = mag / 10 || 1000; // default to 1000 for top-level like 100000
    return step;
  }

  function childrenOf(id, max = 9) {
    const base = Number(id);
    const step = childStepOf(base);
    // If base already has non-zero at that step place, zero it before building
    const divisor = step * 10;
    const parentBase = base - (base % divisor); // normalize
    const kids = [];
    for (let k = 1; k <= max; k++) {
      kids.push(parentBase + k * step);
    }
    return kids;
  }


  function isBaseGeneration(id) {
    const s = String(id);
    // Leftmost non-zero digit must be followed only by zeros
    // e.g., 100000, 200000, 300000, etc.
    if (!/^([1-9])0+$/.test(s)) return false;
    return true;
  }

  function siblingsOf(id, max = 9) {
    const parent = parentIdOf(id);
    if (!parent) return [];
    const step = childStepOf(parent * 10); // siblings share the same generation step as this id
    const sibs = [];
    for (let k = 1; k <= max; k++) {
      sibs.push(parent + k * step);
    }
    return sibs.filter(x => x !== Number(id));
  }

  // Image loader that tests common extensions (case-insensitive)
  function loadPersonImageUrl(id, isSpouse = false) {
    const base = IMAGE_BASE;
    const stem = isSpouse ? `${padId(id)}.1` : `${padId(id)}`;
    const exts = ["jpg", "JPG", "jpeg", "JPEG", "png", "PNG"];
    const candidates = exts.map(ext => `${base}${stem}.${ext}`);
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

  async function imgCell(id, { label = null, spouse = false } = {}) {
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
    } catch {
      // leave empty (no placeholder images as requested)
    }
    const cap = document.createElement("div");
    cap.className = "label";
    cap.textContent = label ?? String(id);
    cell.appendChild(cap);
    // Tap highlight feedback
    cell.addEventListener("touchstart", () => {
      cell.classList.add("tapped");
    }, { passive: true });
    cell.addEventListener("touchend", () => {
      cell.classList.remove("tapped");
    }, { passive: true });
    cell.addEventListener("pointerdown", () => cell.classList.add("tapped"));
    cell.addEventListener("pointerup", () => cell.classList.remove("tapped"));
    cell.addEventListener("pointercancel", () => cell.classList.remove("tapped"));

    // Tap to set anchor
    cell.addEventListener("click", () => {
      pushHistory(anchorId);
      spouseViewOf = null;
      setAnchor(id);
    });
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
    } catch {
      // empty if missing
    }
    const cap = document.createElement("div");
    cap.className = "label";
    cap.textContent = String(id);
    wrap.appendChild(cap);

    // Tap highlight
    wrap.addEventListener("touchstart", () => wrap.classList.add("tapped"), { passive: true });
    wrap.addEventListener("touchend", () => wrap.classList.remove("tapped"), { passive: true });
    wrap.addEventListener("pointerdown", () => wrap.classList.add("tapped"));
    wrap.addEventListener("pointerup", () => wrap.classList.remove("tapped"));
    wrap.addEventListener("pointercancel", () => wrap.classList.remove("tapped"));

    anchorArea.appendChild(wrap);
  }

  async function renderParents(id) {
    parentsGrid.innerHTML = "";
    if (isBaseGeneration(id)) return; // no parents for base generation IDs like 100000
    const parent = parentIdOf(id);
    if (!parent || parent === 0) return;
    parentsGrid.appendChild(await imgCell(parent, { label: `${parent} (Parent)` }));
    try {
      await loadPersonImageUrl(parent, true);
      const cell = await imgCell(parent, { label: `${parent}.1 (Parent 2)`, spouse: true });
      parentsGrid.appendChild(cell);
    } catch {}
  }

  async function renderChildren(id) {
    childrenGrid.innerHTML = "";
    const kids = childrenOf(id);
    for (const kid of kids) {
      const cell = await imgCell(kid, { label: `${kid} (Child)` });
      // append only if image exists (imgCell adds label regardless; we keep empty allowed for "no blanks" preference?)
      childrenGrid.appendChild(cell);
    }
  }

  async function setAnchor(id) {
    anchorId = Number(id);
    await renderAnchor(anchorId);
    await renderParents(anchorId);
    await renderChildren(anchorId);
    // Clear spouse context when changing anchor explicitly
    spouseViewOf = null;
  }

  function pushHistory(id) {
    if (id != null) historyStack.push(id);
  }

  function goBack() {
    if (historyStack.length === 0) return;
    const prev = historyStack.pop();
    spouseViewOf = null;
    setAnchor(prev);
  }

  // --- Spouse handling ------------------------------------------------------
  async function tryShowSpouse(id) {
    // If currently showing a spouse view, swiping back should return to spouseViewOf
    if (spouseViewOf != null) {
      const original = spouseViewOf;
      spouseViewOf = null;
      pushHistory(anchorId);
      setAnchor(original);
      return;
    }
    // Otherwise, show spouse of current anchor if exists
    try {
      const spouseUrl = await loadPersonImageUrl(anchorId, true);
      // Render spouse in anchor area but remember spouseViewOf
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
    } catch {
      // no spouse image — ignore
    }
  }

  // --- Gestures -------------------------------------------------------------
  let tracking = false;
  let startX = 0, startY = 0;
  let dx = 0, dy = 0;
  const SWIPE_THRESHOLD = 50;    // px
  const DIRECTION_LOCK = 10;     // lock to axis if movement exceeds this

  function onPointerDown(e) {
    tracking = true;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0; dy = 0;
  }

  function onPointerMove(e) {
    if (!tracking) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;
  }

  function onPointerUp(e) {
    if (!tracking) return;
    tracking = false;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD) return;

    if (absX > absY) {
      if (dx > 0) {
        // Right: spouse (toggle back if already spouse)
        tryShowSpouse(anchorId);
      } else {
        // Left: return from spouse if in spouse view; otherwise show siblings grid?
        if (spouseViewOf != null) {
          const original = spouseViewOf;
          spouseViewOf = null;
          pushHistory(anchorId);
          setAnchor(original);
        } else {
          // optional: could show siblings, for now do nothing
        }
      }
    } else {
      if (dy < 0) {
        // Up: parents
        // Just re-render parents for clarity
        renderParents(anchorId);
      } else {
        // Down: children
        renderChildren(anchorId);
      }
    }
  }

  // Prevent native scroll/zoom from interfering
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", () => { tracking = false; });

  // Buttons
  backBtn.addEventListener("click", goBack);

  startBtn.addEventListener("click", () => {
    promptModal.classList.remove("hidden");
    startInput.value = "";
    startInput.focus();
  });

  cancelStart.addEventListener("click", () => {
    promptModal.classList.add("hidden");
  });

  confirmStart.addEventListener("click", () => {
    const v = startInput.value.trim();
    if (!/^\d+(\.1)?$/.test(v)) {
      startInput.focus();
      return;
    }
    promptModal.classList.add("hidden");
    pushHistory(anchorId);
    spouseViewOf = null;
    const numeric = Number(v.replace(".1",""));
    setAnchor(numeric);
  });

  startInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmStart.click();
    if (e.key === "Escape") cancelStart.click();
  });

  // Auto-open START on first launch
  window.addEventListener("load", () => {
    setTimeout(() => startBtn.click(), 50);
  });

})();