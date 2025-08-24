// SwipeTree — ButtonsOff Build
// Core rules per user's spec:
// - Swipe ↑ parents, ← siblings, → spouse, ↓ children
// - Numeric logic: fixed 6 digits. Generation expands one digit to the right per level.
//   * children: set next digit (after last non-zero) to 1..9, zero out all to the right
//   * siblings: vary the current generation digit among 1..9 (excluding current), zeros to the right
//   * parent: set current generation digit to 0 (move one level up)
// - Spouse: show '<ID>.1' if the image exists. (Partner branch mapping optional, added later)
// - Long‑press (700ms) the anchor image to edit the label (stored in localStorage for now).

(function(){
  const anchorImg = document.getElementById('anchorImg');
  const anchorLabel = document.getElementById('anchorLabel');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const grid = document.getElementById('grid');
  const backBtn = document.getElementById('backBtn');
  const closeOverlayBtn = document.getElementById('closeOverlay');
  const stage = document.getElementById('stage');

  // ---- Config ----
  // Try multiple bases so the app can run on GitHub Pages or a CDN without edits.
  const IMAGE_BASES = [
    '', // current folder (default). Put your JPGs next to index.html
    'https://allofusbhere.github.io/Family-tree-app/',
    'https://cdn.jsdelivr.net/gh/allofusbhere/Family-tree-app@main/'
  ];
  const PLACEHOLDER = null; // e.g., 'placeholder.jpg' if you want a fallback

  // History
  const historyStack = [];

  // State
  let anchorId = getIdFromHash() || '100000';
  let touchStart = null;
  let longPressTimer = null;
  const LONG_PRESS_MS = 700;
  const SWIPE_THRESHOLD = 30; // px

  // ---- Init ----
  window.addEventListener('hashchange', () => {
    const id = getIdFromHash();
    if (id && id !== anchorId) {
      pushHistory(anchorId);
      setAnchor(id);
    }
  });

  backBtn.addEventListener('click', () => {
    if (!overlay.classList.contains('hidden')) {
      closeOverlay();
      return;
    }
    const prev = historyStack.pop();
    if (prev) setAnchor(prev);
  });

  closeOverlayBtn.addEventListener('click', closeOverlay);

  // Touch / swipe handling on stage
  stage.addEventListener('touchstart', onTouchStart, { passive:false });
  stage.addEventListener('touchmove', onTouchMove, { passive:false });
  stage.addEventListener('touchend', onTouchEnd, { passive:false });

  // Long press to edit label on the anchor image
  anchorImg.addEventListener('touchstart', (e) => startLongPress(e), { passive:false });
  anchorImg.addEventListener('touchend', cancelLongPress, { passive:false });
  anchorImg.addEventListener('mousedown', (e) => startLongPress(e));
  anchorImg.addEventListener('mouseup', cancelLongPress);

  // Kick off
  setAnchor(anchorId);

  // ---- Core Functions ----
  function getIdFromHash(){
    const m = location.hash.match(/id=(\d{6})/);
    return m ? m[1] : null;
  }
  function setHash(id){
    location.hash = '#id=' + id;
  }
  function pushHistory(id){
    if (historyStack.length === 0 || historyStack[historyStack.length-1] !== id){
      historyStack.push(id);
    }
  }

  async function setAnchor(id){
    anchorId = normalizeId(id);
    setHash(anchorId);
    anchorImg.src = await bestImageURL(anchorId);
    anchorImg.alt = anchorId;
    setAnchorLabel(anchorId);
  }

  function normalizeId(id){
    // strip spouse marker if someone passed "140000.1"
    return String(id).split('.')[0].padStart(6, '0').slice(0,6);
  }

  function setAnchorLabel(id){
    const key = 'label:' + id;
    const stored = localStorage.getItem(key);
    anchorLabel.textContent = stored ? stored : id;
  }

  async function bestImageURL(idOrSpouse){
    // return first working URL among bases
    const isSpouse = /\.\d+$/.test(idOrSpouse);
    const fname = idOrSpouse + '.jpg';
    for (const base of IMAGE_BASES){
      const url = base ? (base.replace(/\/?$/, '/') + fname) : fname;
      const ok = await imageExists(url);
      if (ok) return url;
    }
    if (PLACEHOLDER) return PLACEHOLDER;
    // return a non-existent URL (will show broken) if nothing found
    return (IMAGE_BASES[0] ? (IMAGE_BASES[0].replace(/\/?$/, '/') + fname) : fname);
  }

  function imageExists(url){
    return new Promise(resolve => {
      const img = new Image();
      let done=false;
      img.onload = () => { if(!done){ done=true; resolve(true); } };
      img.onerror = () => { if(!done){ done=true; resolve(false); } };
      img.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(); // bust cache
      // give up after 2.5s
      setTimeout(()=>{ if(!done){ done=true; resolve(false);} }, 2500);
    });
  }

  // Relationship math
  function lastNonZeroIndex(id){
    const digits = id.split('').map(d=>parseInt(d,10));
    for (let i=digits.length-1;i>=0;i--){
      if (digits[i] !== 0) return i;
    }
    return -1; // "000000" not expected
  }

  function setDigit(id, idx, val){
    const digits = id.split('').map(d=>parseInt(d,10));
    digits[idx] = val;
    for (let j=idx+1;j<6;j++) digits[j]=0;
    return digits.join('');
  }

  function getChildren(id){
    id = normalizeId(id);
    const i = lastNonZeroIndex(id);
    if (i >= 5) return []; // cannot go deeper; already at last digit
    const next = i+1;
    const out = [];
    for (let d=1; d<=9; d++){
      const child = setDigit(id, next, d);
      out.push(child);
    }
    return out;
  }

  function getSiblings(id){
    id = normalizeId(id);
    const i = lastNonZeroIndex(id);
    if (i < 0) return [];
    const out = [];
    const currDigit = parseInt(id[i],10);
    for (let d=1; d<=9; d++){
      if (d === currDigit) continue;
      out.push(setDigit(id, i, d));
    }
    return out;
  }

  function getParent(id){
    id = normalizeId(id);
    const i = lastNonZeroIndex(id);
    if (i <= 0) return null; // no parent above first digit
    // parent is same as id with current generation digit zeroed
    const parent = setDigit(id, i, 0);
    return parent;
  }

  // Swipe mechanics
  function onTouchStart(e){
    if (e.touches && e.touches.length>1) return; // ignore multi-touch
    const t = e.touches ? e.touches[0] : e;
    touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
    // prevent page scroll
    if (e.cancelable) e.preventDefault();
  }
  function onTouchMove(e){
    // prevent page scroll while swiping
    if (e.cancelable) e.preventDefault();
  }
  async function onTouchEnd(e){
    if (!touchStart) return;
    const t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : e;
    const dx = (t.clientX - touchStart.x);
    const dy = (t.clientY - touchStart.y);
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const dt = Date.now() - touchStart.time;
    touchStart = null;

    if (adx < SWIPE_THRESHOLD && ady < SWIPE_THRESHOLD) {
      // tap
      return;
    }
    if (adx > ady) {
      // horizontal
      if (dx > 0) {
        // right → spouse
        await showSpouse();
      } else {
        // left ← siblings
        await showGrid('Siblings', getSiblings(anchorId));
      }
    } else {
      // vertical
      if (dy < 0) {
        // up ↑ parents
        const parent = getParent(anchorId);
        const ids = [];
        if (parent) ids.push(parent);
        // attempt to add parent's spouse if available (parent+'.1' image)
        // this is only a visual pair; tapping it will navigate to parent (numeric) or spouse image if .1 tapped
        await showGrid('Parents', ids, { tryPairSpouse: true });
      } else {
        // down ↓ children
        await showGrid('Children', getChildren(anchorId));
      }
    }
  }

  async function showSpouse(){
    const spouseId = anchorId + '.1';
    const ok = await imageExists(await bestImageURL(spouseId));
    const ids = ok ? [spouseId] : [];
    await showGrid('Spouse', ids, { allowSpouseId: true });
  }

  async function showGrid(title, ids, options){
    options = options || {};
    overlayTitle.textContent = title;
    grid.innerHTML = '';
    overlay.classList.remove('hidden');

    // Build cards for any IDs that actually have images available
    const cards = [];
    for (const id of ids){
      const url = await bestImageURL(id);
      const exists = await imageExists(url);
      if (!exists) continue;

      const card = document.createElement('div');
      card.className = 'card';
      const img = document.createElement('img');
      img.src = url;
      img.alt = id;
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = labelForId(id);

      card.appendChild(img);
      card.appendChild(name);
      card.addEventListener('click', () => {
        closeOverlay();
        // If user tapped spouse image like "140000.1", navigate to numeric partner (140000)
        const numeric = id.split('.')[0];
        if (numeric !== anchorId){
          pushHistory(anchorId);
          setAnchor(numeric);
        }
      });
      grid.appendChild(card);
      cards.push(card);
    }

    // Optional: attempt to pair parent's spouse
    if (options.tryPairSpouse && ids.length === 1){
      const p = ids[0];
      if (/^\d{6}$/.test(p)){
        const spouseImgId = p + '.1';
        const url = await bestImageURL(spouseImgId);
        if (await imageExists(url)){
          const card = document.createElement('div');
          card.className = 'card';
          const img = document.createElement('img');
          img.src = url;
          img.alt = spouseImgId;
          const name = document.createElement('div');
          name.className = 'name';
          name.textContent = labelForId(spouseImgId);
          card.appendChild(img);
          card.appendChild(name);
          card.addEventListener('click', () => {
            closeOverlay();
            pushHistory(anchorId);
            setAnchor(p); // navigate to numeric parent when tapping spouse image
          });
          grid.appendChild(card);
        }
      }
    }

    if (grid.children.length === 0){
      // Nothing to show, quietly close
      closeOverlay();
    }
  }

  function closeOverlay(){ overlay.classList.add('hidden'); }

  function labelForId(id){
    const key = 'label:' + id.split('.')[0]; // keep spouse sharing same label as numeric
    return localStorage.getItem(key) || id;
  }

  function startLongPress(e){
    cancelLongPress();
    longPressTimer = setTimeout(() => {
      e.preventDefault?.();
      const current = labelForId(anchorId);
      const next = prompt('Edit label for ' + anchorId, current);
      if (next != null){
        localStorage.setItem('label:' + anchorId, next.trim());
        setAnchorLabel(anchorId);
      }
    }, LONG_PRESS_MS);
  }
  function cancelLongPress(){
    if (longPressTimer){
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

})();