
/* SwipeTree — interaction enhancements (2025‑08‑13)
   What this file does (drop‑in, non‑invasive to your relationship math):
   1) Enables swipe‑right to "spouse back" (returns to pre‑spouse anchor).
   2) Restores double‑tap editing to save a Name (and optional DOB).
   3) Renders the person's Name label under each image (from localStorage).
   4) Keeps the anchor highlight ON until a new anchor is chosen.
   5) Provides tiny helper hooks you can call from your existing logic.
*/

// ======= Simple state =======
const el = {
  stage: document.getElementById('stage'),
  startBtn: document.getElementById('startBtn'),
  backBtn: document.getElementById('backBtn'),
  anchorCard: document.getElementById('anchorCard'),
  anchorImg: document.getElementById('anchorImg'),
  anchorLabel: document.getElementById('anchorLabel'),
};

// Your app should manage this via history. We add a light spouse memory.
let currentId = null;
let spouseBackId = null;     // set when we jump to spouse via swipe-left
let lastGesture = null;      // 'spouse' | other

// ======= Storage helpers (name & dob) =======
function getName(id) {
  return localStorage.getItem(`name:${id}`) || '';
}
function setName(id, name) {
  if (name) localStorage.setItem(`name:${id}`, name.trim());
}
function getDOB(id) {
  return localStorage.getItem(`dob:${id}`) || '';
}
function setDOB(id, dob) {
  if (dob) localStorage.setItem(`dob:${id}`, dob.trim());
}

// Compose label text shown under each image
function labelFor(id) {
  const nm = getName(id);
  const dob = getDOB(id);
  if (nm && dob) return `${nm} — ${dob}`;
  if (nm) return nm;
  return String(id || '');
}

// ======= Rendering: anchor image + persistent highlight =======
function setAnchor(id, { fromSpouse = false } = {}) {
  currentId = id;
  // Update image src using your existing filename scheme. We keep it simple:
  // Expect images to live next to the app; adjust pathing if your repo differs.
  const tryExts = ['.jpg','.JPG','.jpeg','.JPEG','.png','.PNG','.webp','.WEBP'];
  // Use the first extension that succeeds by optimistic path; your loader may replace this.
  // We set a default; a more robust loader can be swapped in later.
  el.anchorImg.src = `${id}.jpg`;
  el.anchorImg.onerror = () => { el.anchorImg.src = `${id}.JPG`; };
  el.anchorLabel.textContent = labelFor(id);

  el.anchorCard.dataset.personId = id;
  // Persistent highlight
  el.anchorCard.classList.add('active');

  // If we just came back from spouse via swipe-right, clear spouse context
  if (fromSpouse) {
    lastGesture = null;
  }
}

// ======= Spouse navigation hooks =======
// Call this when moving TO spouse (e.g., on swipe-left)
function goToSpouse(spouseId) {
  if (!currentId) return;
  spouseBackId = currentId;   // remember where we came from
  lastGesture = 'spouse';
  setAnchor(spouseId);
}

// Called on swipe-right; returns to previous anchor IF last move was spouse
function spouseBack() {
  if (lastGesture === 'spouse' && spouseBackId) {
    const prev = spouseBackId;
    spouseBackId = null;
    setAnchor(prev, { fromSpouse: true });
    return true;
  }
  return false;
}

// ======= Double‑tap support =======
const DoubleTap = (function() {
  const THRESH_MS = 300;
  let lastTap = 0;
  return function onTap(target, onDouble) {
    const now = Date.now();
    if (now - lastTap < THRESH_MS) {
      lastTap = 0;
      onDouble();
    } else {
      lastTap = now;
      // brief visual feedback on single tap
      const card = target.closest('.person-card');
      if (card) {
        card.classList.add('tapped');
        setTimeout(() => card.classList.remove('tapped'), 150);
      }
    }
  };
})();

function editPersonPrompt(id) {
  const currentName = getName(id);
  const currentDOB = getDOB(id);
  const name = prompt(`Enter name for ${id}:`, currentName || '');
  if (name === null) return; // cancelled
  const dob = prompt(`Enter DOB (optional) for ${id}:`, currentDOB || '');
  setName(id, name);
  if (dob !== null) setDOB(id, dob);
  // update anchor label if needed
  if (String(id) === String(currentId)) {
    el.anchorLabel.textContent = labelFor(id);
  }
  // also update any card in grids that has this id
  document.querySelectorAll(`[data-person-id="${id}"] .label`).forEach(n => n.textContent = labelFor(id));
}

// Attach double‑tap to anchor image
['click', 'touchend'].forEach(evt => {
  el.anchorCard.addEventListener(evt, (e) => {
    // Don't treat a swipe end as a tap
    if (swipe._moved) return;
    DoubleTap(e.target, () => {
      const id = el.anchorCard.dataset.personId;
      if (!id) return;
      editPersonPrompt(id);
    });
  }, { passive: true });
});

// ======= Swipe detection (no external libs) =======
const swipe = {
  startX: 0, startY: 0,
  endX: 0, endY: 0,
  _moved: false,
  reset() { this.startX = this.startY = this.endX = this.endY = 0; this._moved = false; }
};

const SWIPE_THRESHOLD = 45; // px

el.stage.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  swipe.startX = t.clientX;
  swipe.startY = t.clientY;
  swipe._moved = false;
}, { passive: true });

el.stage.addEventListener('touchmove', (e) => {
  const t = e.changedTouches[0];
  swipe.endX = t.clientX;
  swipe.endY = t.clientY;
  swipe._moved = true;
}, { passive: true });

el.stage.addEventListener('touchend', (e) => {
  const dx = (swipe.endX || swipe.startX) - swipe.startX;
  const dy = (swipe.endY || swipe.startY) - swipe.startY;
  const ax = Math.abs(dx), ay = Math.abs(dy);
  const horizontal = ax > ay && ax > SWIPE_THRESHOLD;
  const vertical = ay > ax && ay > SWIPE_THRESHOLD;

  if (horizontal) {
    if (dx < 0) {
      // Swipe LEFT: go to spouse (call your real spouse resolver here)
      // You likely have a function to compute spouseId for currentId.
      const spouseId = resolveSpouseId(currentId);
      if (spouseId) goToSpouse(spouseId);
    } else {
      // Swipe RIGHT: go back from spouse (if applicable)
      if (!spouseBack()) {
        // optional: no-op or you can route right-swipe to siblings if desired
      }
    }
  } else if (vertical) {
    if (dy < 0) {
      // Swipe UP: parents (handoff to your existing logic)
      if (typeof onSwipeUpParents === 'function') onSwipeUpParents(currentId);
    } else {
      // Swipe DOWN: children
      if (typeof onSwipeDownChildren === 'function') onSwipeDownChildren(currentId);
    }
  }

  swipe.reset();
}, { passive: true });

// ======= Minimal spouse resolver (override with your logic) =======
function resolveSpouseId(id) {
  if (!id) return null;
  const s = String(id);
  // If has .1 already, try base partner (strip .1)
  if (s.includes('.1')) {
    return s.replace('.1','');
  }
  // else try partner with .1
  return s + '.1';
}

// ======= START / BACK buttons =======
el.startBtn?.addEventListener('click', () => {
  const seed = prompt('Enter starting ID:');
  if (!seed) return;
  setAnchor(seed);
});

el.backBtn?.addEventListener('click', () => {
  // If last was spouse, behave like spouseBack. Else, you likely have your own historyStack.
  if (!spouseBack()) {
    if (typeof onBack === 'function') onBack();
  }
});

// ======= Public hooks for your existing app =======
// Call setAnchorExternal(id) whenever your logic changes the anchor, to keep highlight + label in sync.
window.setAnchorExternal = function(id) { setAnchor(id); };
// Call setCardNameLabel(el, id) when you render any grid person-card to apply label & dbl‑tap handler.
window.setCardNameLabel = function(cardEl, id) {
  if (!cardEl) return;
  cardEl.dataset.personId = id;
  const labelEl = cardEl.querySelector('.label') || (() => {
    const d = document.createElement('div');
    d.className = 'label';
    cardEl.appendChild(d);
    return d;
  })();
  labelEl.textContent = labelFor(id);

  // double‑tap for grid cards
  ['click','touchend'].forEach(evt => {
    cardEl.addEventListener(evt, (e) => {
      if (swipe._moved) return;
      DoubleTap(e.target, () => editPersonPrompt(id));
    }, { passive: true });
  });
};

// Initialize (optional): if your page sets a default currentId elsewhere, call setAnchorExternal there.
setTimeout(() => {
  // no-op; waiting for START prompt or external call
}, 0);
