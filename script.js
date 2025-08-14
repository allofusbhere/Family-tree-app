// SwipeTree — Spouse & Double‑Tap Build (1 & 2)
// Implements:
// (1) Swipe-right toggles spouse ('.1') with existence check and graceful fallback
// (2) Double‑tap to edit + persist a person's name/DOB (localStorage)
// No hardcoded relationships. Images loaded from /family-tree-images/ on the same GitHub Pages origin.

(function(){
  'use strict';

  const BUILD_TAG = new Date().toISOString().replace(/[-:TZ]/g,'').slice(0,14); // YYYYMMDDHHMMSS
  const STATUS = document.getElementById('status');
  const buildTagEl = document.getElementById('buildTag');
  buildTagEl.textContent = `build ${BUILD_TAG}`;

  // Where images live: sibling repo folder at /family-tree-images/
  const IMAGE_BASE = `${location.origin}/family-tree-images/`;

  const anchorImg = document.getElementById('anchorImg');
  const stage = document.getElementById('stage');
  const startBtn = document.getElementById('startBtn');
  const backBtn  = document.getElementById('backBtn');
  const labelName = document.getElementById('labelName');
  const labelDob  = document.getElementById('labelDob');

  let currentId = null;
  const historyStack = [];

  // Utility: build a cache-busted URL for a given ID (with or without extension)
  function imgUrlFor(id) {
    // Accept id like "140000" or "140000.1"; we try common image extensions dynamically
    // To check existence, we'll attempt load in code. For direct src, use .jpg by default.
    return `${IMAGE_BASE}${id}.jpg?b=${BUILD_TAG}`;
  }

  // Try loading an image to see if it exists (tries several extensions)
  function checkImageExists(id) {
    const exts = ['.jpg', '.JPG', '.jpeg', '.JPEG', '.png', '.PNG', '.webp', '.WEBP'];
    return new Promise((resolve) => {
      let index = 0;
      const tryNext = () => {
        if (index >= exts.length) {
          resolve(null);
          return;
        }
        const ext = exts[index++];
        const test = new Image();
        test.onload = () => resolve({ id, url: `${IMAGE_BASE}${id}${ext}?b=${BUILD_TAG}` });
        test.onerror = tryNext;
        test.src = `${IMAGE_BASE}${id}${ext}?b=${BUILD_TAG}`;
      };
      tryNext();
    });
  }

  async function setAnchor(id, pushHistory = true) {
    if (!id) return;
    STATUS.textContent = `Loading ${id}…`;
    const found = await checkImageExists(id);
    if (!found) {
      STATUS.textContent = `Image not found for ${id}`;
      return;
    }
    if (pushHistory && currentId) historyStack.push(currentId);
    currentId = id;
    anchorImg.src = found.url;
    anchorImg.alt = `Person ${id}`;
    STATUS.textContent = `Showing ${id}`;
    applyLabel(id);
  }

  function applyLabel(id) {
    const meta = getPersonMeta(id);
    labelName.textContent = meta?.name || '';
    labelDob.textContent  = meta?.dob ? `DOB: ${meta.dob}` : '';
  }

  function getPersonMeta(id) {
    try {
      const raw = localStorage.getItem(`label:${id}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function setPersonMeta(id, meta) {
    localStorage.setItem(`label:${id}`, JSON.stringify(meta || {}));
    applyLabel(id);
  }

  // Spouse toggle: if id has ".1" remove it; else append ".1"
  async function toggleSpouse() {
    if (!currentId) return;
    const spouseId = currentId.includes('.1') ? currentId.replace('.1', '') : `${currentId}.1`;
    const exists = await checkImageExists(spouseId);
    if (!exists) {
      STATUS.textContent = `No spouse image for ${currentId}`;
      return;
    }
    await setAnchor(spouseId, true);
  }

  // Back button
  backBtn.addEventListener('click', () => {
    const prev = historyStack.pop();
    if (prev) setAnchor(prev, false);
  });

  // Start button: prompt for an ID
  startBtn.addEventListener('click', async () => {
    const input = prompt('Enter starting ID (e.g., 140000):', currentId || '');
    if (input && input.trim()) {
      await setAnchor(input.trim(), true);
    }
  });

  // Double‑tap detection on the stage & anchor for touch and click
  let lastTapTime = 0;
  const DT_THRESHOLD_MS = 300;

  function maybeHandleDoubleTap(ev) {
    const now = Date.now();
    if (now - lastTapTime <= DT_THRESHOLD_MS) {
      ev.preventDefault();
      handleEditCurrent();
    }
    lastTapTime = now;
  }

  function handleEditCurrent() {
    if (!currentId) return;
    const existing = getPersonMeta(currentId) || { name: '', dob: '' };
    const name = prompt(`Edit name for ${currentId}:`, existing.name || '');
    if (name === null) return; // cancelled
    const dob  = prompt(`Edit DOB for ${currentId} (optional):`, existing.dob || '');
    if (dob === null) return;
    setPersonMeta(currentId, { name: name.trim(), dob: dob.trim() });
    STATUS.textContent = `Saved label for ${currentId}`;
  }

  // Touch listeners
  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 50; // px

  function onTouchStart(e) {
    const t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    maybeHandleDoubleTap(e);
  }
  async function onTouchEnd(e) {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    // Horizontal swipe dominates when |dx| > |dy| and exceeds threshold
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx > 0) {
        // Swipe right → spouse
        await toggleSpouse();
      } else {
        // Swipe left reserved for siblings in other builds; noop here
        STATUS.textContent = 'Left swipe reserved (not enabled in this build).';
      }
    }
  }

  // Mouse double click
  stage.addEventListener('dblclick', (e) => {
    e.preventDefault();
    handleEditCurrent();
  });

  // Touch handlers
  stage.addEventListener('touchstart', onTouchStart, { passive: true });
  stage.addEventListener('touchend', onTouchEnd, { passive: true });
  anchorImg.addEventListener('touchstart', onTouchStart, { passive: true });
  anchorImg.addEventListener('touchend', onTouchEnd, { passive: true });

  // Prevent image dragging & ghost image on desktop
  anchorImg.addEventListener('dragstart', (e) => e.preventDefault());

  // On first load: prompt for a starting ID (no hardcoding)
  window.addEventListener('load', async () => {
    const first = prompt('Enter starting ID (e.g., 140000):', '');
    if (first && first.trim()) {
      await setAnchor(first.trim(), true);
    } else {
      STATUS.textContent = 'Tap Start to enter an ID.';
    }
  });
})();