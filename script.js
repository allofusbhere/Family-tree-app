
/*
  SwipeTree — script.js
  Build: 2025-08-15e
  - Purge any edit UI (remove 'Long-press to edit' and edit panel if present)
  - Hard-hide anchor when showing grids (no background bleed)
  - Clamp any oversized images (no overflow)
  - Tap a grid image = navigate & close grid
  - Default start = 100000
  - Right swipe = spouse; Up swipe = parents
*/

(function(){
  'use strict';

  // Lock page from scrolling/zoom bleed
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  const IMG_BASE = (typeof window !== 'undefined' && window.IMG_BASE) ? window.IMG_BASE : './';
  const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
  const PLACEHOLDER_PARENT2 = 'placeholder_parent2.jpg';
  const PLACEHOLDER_MISSING = 'placeholder.jpg';

  const $anchor = document.getElementById('anchor');
  const $grid = document.getElementById('grid');
  const $startBtn = document.getElementById('startBtn'); // optional

  // Center/size anchor area
  if ($anchor){
    $anchor.style.display = 'grid';
    $anchor.style.placeItems = 'center';
    $anchor.style.minHeight = '70vh';
    $anchor.style.padding = '8px 0';
  }
  if ($grid){
    $grid.style.marginTop = '10px';
  }

  // Remove any existing edit UI/labels injected by older builds
  function killEditUI(){
    // Remove elements that advertise long-press or edit label areas
    const candidates = Array.from(document.querySelectorAll('*'))
      .filter(el => el && el.textContent && /long-press to edit|edit label/i.test(el.textContent));
    for (const el of candidates){
      el.remove();
    }
    // Common ids/classes from past builds
    ['editPanel', 'labelEditor', 'edit-label', 'editor'].forEach(id => {
      const n = document.getElementById(id);
      if (n) n.remove();
    });
    document.querySelectorAll('.edit,.label-editor,.edit-panel').forEach(n => n.remove());
  }

  killEditUI();

  let anchorId = null;
  let touchStartX = 0, touchStartY = 0;

  function showAnchor(show){
    if (!$anchor) return;
    if (show){
      $anchor.style.display = 'grid';
      $anchor.style.minHeight = '70vh';
    } else {
      $anchor.innerHTML = '';
      $anchor.style.display = 'none';
      $anchor.style.minHeight = '0';
    }
  }

  function buildCandidateUrls(id){
    return EXTENSIONS.map(ext => IMG_BASE + id + ext);
  }
  function imageExists(url){
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
    });
  }
  async function resolveFirstExistingUrl(id){
    const candidates = buildCandidateUrls(id);
    for (const url of candidates){
      if (await imageExists(url)) return url;
    }
    return null;
  }
  function stripAfterFirstDot(id){
    const dot = id.indexOf('.');
    return dot === -1 ? id : id.slice(0, dot);
  }
  function isSpouseVariant(id){
    return id.includes('.1');
  }
  function digitsOnly(id){
    return stripAfterFirstDot(id);
  }
  function toInt(id){
    return parseInt(digitsOnly(id), 10);
  }

  // Parent #1: zero the 1000s digit; if already zero, zero 10000s as fallback
  function getParent1Id(id){
    const n = toInt(id);
    if (Number.isNaN(n)) return null;
    const thousandsDigit = Math.floor(n / 1000) % 10;
    if (thousandsDigit !== 0){
      const parent = n - (thousandsDigit * 1000);
      return String(parent).padStart(String(n).length, '0');
    }
    const tenThousandsDigit = Math.floor(n / 10000) % 10;
    if (tenThousandsDigit !== 0){
      const parentUpper = n - (tenThousandsDigit * 10000);
      return String(parentUpper).padStart(String(n).length, '0');
    }
    return null;
  }

  async function getParent2Id(parent1Id){
    if (!parent1Id) return null;
    const genericSpouseId = `${parent1Id}.1`;
    const genericUrl = await resolveFirstExistingUrl(genericSpouseId);
    if (genericUrl) return genericSpouseId;
    return null;
  }

  function makeImg(urlOrNull, alt){
    const img = document.createElement('img');
    img.draggable = false;
    img.alt = alt || '';
    img.style.maxWidth = '92vw';
    img.style.maxHeight = '68vh';  // tight clamp to avoid overflow under Safari UI
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    img.style.imageRendering = 'auto';
    if (urlOrNull) img.src = urlOrNull;
    return img;
  }

  function makeGridImg(urlOrNull, alt){
    const img = document.createElement('img');
    img.draggable = false;
    img.alt = alt || '';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.maxHeight = '42vh'; // parents grid clamp
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    if (urlOrNull) img.src = urlOrNull;
    return img;
  }

  async function loadImageInto(container, id, addLabel = true, gridMode = false){
    if (!container) return false;
    container.innerHTML = '';

    const url = await resolveFirstExistingUrl(id);
    let img;
    if (url){
      img = gridMode ? makeGridImg(url, id) : makeImg(url, id);
    } else {
      const phUrl = await resolveFirstExistingUrl(PLACEHOLDER_MISSING);
      img = gridMode ? makeGridImg(phUrl, '(missing) ' + id) : makeImg(phUrl, '(missing) ' + id);
    }

    const wrap = document.createElement('div');
    wrap.style.textAlign = 'center';
    wrap.appendChild(img);

    if (addLabel){
      const label = document.createElement('div');
      label.textContent = id;
      label.style.marginTop = '8px';
      label.style.fontSize = '14px';
      label.style.opacity = '0.9';
      wrap.appendChild(label);
    }

    container.appendChild(wrap);
    return true;
  }

  async function loadAnchor(id){
    anchorId = id;
    await loadImageInto($anchor, id, true, false);
    if ($grid) $grid.innerHTML = '';
    showAnchor(true);
    killEditUI();
  }

  // RIGHT swipe: spouse for current
  async function handleSwipeRight(){
    if (!anchorId) return;
    if (isSpouseVariant(anchorId)){
      const base = stripAfterFirstDot(anchorId);
      await loadAnchor(base);
      return;
    }
    const spouseId = `${anchorId}.1`;
    const url = await resolveFirstExistingUrl(spouseId);
    if (url){
      await loadAnchor(spouseId);
    }
  }

  // Helper: tappable card
  function addTappableCard(parentEl, personId, title){
    const card = document.createElement('div');
    card.style.border = '1px solid #333';
    card.style.borderRadius = '14px';
    card.style.padding = '10px';
    card.style.background = '#0b0b0b';
    card.style.cursor = 'pointer';

    const ttl = document.createElement('div');
    ttl.textContent = title;
    ttl.style.fontWeight = '600';
    ttl.style.textAlign = 'center';
    ttl.style.marginBottom = '8px';
    card.appendChild(ttl);

    const imgWrap = document.createElement('div');
    card.appendChild(imgWrap);

    // load image in grid mode, then attach tap
    loadImageInto(imgWrap, personId, true, true).then(()=>{
      card.addEventListener('click', async () => {
        await loadAnchor(personId); // closes grid (since anchor reappears)
      }, { once: true });
    });

    parentEl.appendChild(card);
  }

  // UP swipe: parents (anchor hidden)
  async function handleSwipeUp(){
    if (!$grid || !anchorId) return;
    $grid.innerHTML = '';
    showAnchor(false);
    killEditUI();

    const p1 = getParent1Id(anchorId);

    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr 1fr';
    row.style.gap = '16px';
    row.style.maxWidth = '96vw';
    row.style.margin = '12px auto';

    if (p1){
      addTappableCard(row, p1, 'Parent #1');
      const p2 = await getParent2Id(p1);
      if (p2){
        addTappableCard(row, p2, 'Parent #2');
      } else {
        const holder = document.createElement('div');
        holder.style.border = '1px solid #333';
        holder.style.borderRadius = '14px';
        holder.style.padding = '10px';
        holder.style.background = '#0b0b0b';
        const ttl = document.createElement('div');
        ttl.textContent = 'Parent #2 (placeholder)';
        ttl.style.fontWeight = '600';
        ttl.style.textAlign = 'center';
        ttl.style.marginBottom = '8px';
        holder.appendChild(ttl);
        const phUrl = await resolveFirstExistingUrl(PLACEHOLDER_PARENT2) || await resolveFirstExistingUrl(PLACEHOLDER_MISSING);
        const img = makeGridImg(phUrl, '(missing) Parent #2');
        holder.appendChild(img);
        row.appendChild(holder);
      }
    } else {
      const m = document.createElement('div');
      m.textContent = '— no parent #1 —';
      m.style.textAlign = 'center';
      m.style.opacity = '0.8';
      row.appendChild(m);
    }

    $grid.appendChild(row);
  }

  // Touch
  function onTouchStart(e){
    const t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }
  function onTouchEnd(e){
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const SWIPE_MIN = 30;

    if (absX > absY && absX > SWIPE_MIN){
      if (dx > 0){
        handleSwipeRight();
      } else {
        // left reserved
      }
    } else if (absY > absX && absY > SWIPE_MIN){
      if (dy < 0){
        handleSwipeUp();
      } else {
        // down reserved
      }
    }
  }

  async function boot(){
    let startId = (location.hash || '').replace('#','').trim();
    if (!startId) startId = '100000';
    await loadAnchor(startId);

    if ($startBtn){
      $startBtn.addEventListener('click', () => {
        const id = prompt('Enter starting ID (e.g., 140000):', startId) || startId;
        location.hash = id;
        location.reload();
      });
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot);
  }
})();
