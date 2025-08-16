
/*
  SwipeTree — script.js
  Build: 2025-08-15b (hide anchor on grids + full images in grid)
*/

(function(){
  'use strict';

  const IMG_BASE = (typeof window !== 'undefined' && window.IMG_BASE) ? window.IMG_BASE : './';
  const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
  const PLACEHOLDER_PARENT2 = 'placeholder_parent2.jpg';
  const PLACEHOLDER_MISSING = 'placeholder.jpg';

  const $anchor = document.getElementById('anchor');
  const $grid = document.getElementById('grid');

  // Ensure baseline styles so images can expand
  if ($grid){
    $grid.style.marginTop = '10px';
  }

  let anchorId = null;
  let touchStartX = 0, touchStartY = 0;

  function showAnchor(show){
    if (!$anchor) return;
    $anchor.style.display = show ? 'block' : 'none';
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

  // Parent #1: zero-out current generation 1000s digit if present; else try 10000s
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
    // full, uncropped display inside card
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.maxHeight = '60vh';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    if (urlOrNull) img.src = urlOrNull;
    return img;
  }

  async function loadImageInto(container, id, addLabel = true){
    if (!container) return false;
    container.innerHTML = '';

    const url = await resolveFirstExistingUrl(id);
    let img;
    if (url){
      img = makeImg(url, id);
    } else {
      const phUrl = await resolveFirstExistingUrl(PLACEHOLDER_MISSING);
      img = makeImg(phUrl, '(missing) ' + id);
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
    await loadImageInto($anchor, id, true);
    if ($grid) $grid.innerHTML = '';
    showAnchor(true); // ensure anchor visible when loading a person
  }

  // RIGHT swipe: spouse for current
  async function handleSwipeRight(){
    if (!anchorId) return;
    if (isSpouseVariant(anchorId)){
      const base = stripAfterFirstDot(anchorId);
      await loadAnchor(base);
      return;
    }
    const spouseId = `${anchorId}.1`
    const url = await resolveFirstExistingUrl(spouseId);
    if (url){
      await loadAnchor(spouseId);
    }
  }

  // UP swipe: show two parents and HIDE anchor
  async function handleSwipeUp(){
    if (!$grid || !anchorId) return;
    $grid.innerHTML = '';

    // hide anchor while grid is shown
    showAnchor(false);

    const p1 = getParent1Id(anchorId);

    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr 1fr';
    row.style.gap = '16px';
    row.style.maxWidth = '96vw';
    row.style.margin = '12px auto';

    const c1 = document.createElement('div');
    c1.style.border = '1px solid #333';
    c1.style.borderRadius = '14px';
    c1.style.padding = '10px';
    c1.style.background = '#0b0b0b';

    const c2 = document.createElement('div');
    c2.style.border = '1px solid #333';
    c2.style.borderRadius = '14px';
    c2.style.padding = '10px';
    c2.style.background = '#0b0b0b';

    const l1 = document.createElement('div');
    l1.textContent = 'Parent #1';
    l1.style.fontWeight = '600';
    l1.style.textAlign = 'center';
    l1.style.marginBottom = '8px';

    const l2 = document.createElement('div');
    l2.textContent = 'Parent #2';
    l2.style.fontWeight = '600';
    l2.style.textAlign = 'center';
    l2.style.marginBottom = '8px';

    c1.appendChild(l1);
    c2.appendChild(l2);

    if (p1){
      const card1 = document.createElement('div');
      c1.appendChild(card1);
      await loadImageInto(card1, p1, true);
    } else {
      const m = document.createElement('div');
      m.textContent = '— no parent #1 —';
      m.style.textAlign = 'center';
      m.style.opacity = '0.8';
      c1.appendChild(m);
    }

    let p2 = null;
    if (p1){
      p2 = await getParent2Id(p1);
    }
    const card2 = document.createElement('div');
    c2.appendChild(card2);
    if (p2){
      await loadImageInto(card2, p2, true);
    } else {
      const ph = await resolveFirstExistingUrl(PLACEHOLDER_PARENT2) || await resolveFirstExistingUrl(PLACEHOLDER_MISSING);
      card2.appendChild(makeImg(ph, '(missing) Parent #2'));
      const label = document.createElement('div');
      label.textContent = 'Parent #2 (placeholder)';
      label.style.marginTop = '8px';
      label.style.fontSize = '14px';
      label.style.opacity = '0.9';
      label.style.textAlign = 'center';
      card2.appendChild(label);
    }

    row.appendChild(c1);
    row.appendChild(c2);
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
    if (!startId){
      startId = (typeof window !== 'undefined' && window.prompt) ? window.prompt('Enter starting ID (e.g., 140000):','140000') : '140000';
    }
    await loadAnchor(startId);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot);
  }
})();
