
/*
  SwipeTree — script.js
  Build: 2025-08-15g (Fix-All)
  - Two-Parent display on UP swipe
  - Spouse toggle on RIGHT swipe
  - Anchor hard-hidden when grid opens
  - Tap grid image to navigate & close grid
  - Ultra clamp to prevent oversized images/bleed
  - Default start = 100000
  - No edit UI
*/

(function(){
  'use strict';

  // Prevent page scroll/zoom from causing bleed
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  const IMG_BASE = (typeof window !== 'undefined' && window.IMG_BASE) ? window.IMG_BASE : './';
  const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
  const PLACEHOLDER_PARENT2 = 'placeholder_parent2.jpg';
  const PLACEHOLDER_MISSING = 'placeholder.jpg';

  const $anchor = document.getElementById('anchor');
  const $grid = document.getElementById('grid');
  const $startBtn = document.getElementById('startBtn'); // optional

  // Clean any legacy edit UI text if present
  function killEditUI(){
    const suspects = Array.from(document.querySelectorAll('*'))
      .filter(el => el && el.textContent && /long-press to edit|edit label/i.test(el.textContent));
    suspects.forEach(n => n.remove());
    ['editPanel','labelEditor','edit-label','editor'].forEach(id => {
      const n = document.getElementById(id); if (n) n.remove();
    });
    document.querySelectorAll('.edit,.label-editor,.edit-panel').forEach(n => n.remove());
  }
  killEditUI();

  // Anchor helpers
  function showAnchor(show){
    if (!$anchor) return;
    if (show){
      $anchor.style.display = 'grid';
      $anchor.style.minHeight = 'calc(100vh - 120px)';
    } else {
      $anchor.innerHTML = '';
      $anchor.style.display = 'none';
      $anchor.style.minHeight = '0';
    }
  }

  let anchorId = null;

  // Image lookup
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

  // ID utils
  function stripAfterFirstDot(id){
    const dot = id.indexOf('.');
    return dot === -1 ? id : id.slice(0, dot);
  }
  function isSpouseVariant(id){ return id.includes('.1'); }
  function digitsOnly(id){ return stripAfterFirstDot(id); }
  function toInt(id){ return parseInt(digitsOnly(id), 10); }

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

  // Loaders
  async function loadImageInto(container, id, {label=true, gridMode=false} = {}){
    if (!container) return false;
    container.innerHTML = '';

    const url = await resolveFirstExistingUrl(id);
    const img = document.createElement('img');
    img.draggable = false;
    img.alt = id;
    img.style.display = 'block';
    img.style.margin = '0 auto';
    if (gridMode){
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.maxHeight = '42vh';
      img.style.objectFit = 'contain';
    } else {
      img.style.maxWidth = '96vw';
      img.style.maxHeight = 'calc(100vh - 140px)';
      img.style.width = 'auto';
      img.style.height = 'auto';
      img.style.objectFit = 'contain';
    }
    img.src = url || (await resolveFirstExistingUrl(PLACEHOLDER_MISSING)) || '';

    const wrap = document.createElement('div');
    wrap.style.textAlign = 'center';
    wrap.appendChild(img);

    if (label){
      const l = document.createElement('div');
      l.className = 'label';
      l.textContent = id;
      l.style.marginTop = gridMode ? '8px' : '10px';
      l.style.fontSize = gridMode ? '14px' : '16px';
      l.style.opacity = '.9';
      wrap.appendChild(l);
    }

    container.appendChild(wrap);
    return true;
  }

  async function loadAnchor(id){
    anchorId = id;
    await loadImageInto($anchor, id, {label:true, gridMode:false});
    if ($grid) $grid.innerHTML = '';
    showAnchor(true);
    killEditUI();
  }

  // Spouse (RIGHT)
  async function handleSwipeRight(){
    if (!anchorId) return;
    if (isSpouseVariant(anchorId)){
      await loadAnchor(stripAfterFirstDot(anchorId));
      return;
    }
    const spouseId = `${anchorId}.1`;
    if (await resolveFirstExistingUrl(spouseId)){
      await loadAnchor(spouseId);
    }
  }

  // Grid card helper
  function addCard(parentEl, personId, title, clickable=true){
    const card = document.createElement('div');
    card.className = 'card' + (clickable ? ' clickable' : '');

    const ttl = document.createElement('div');
    ttl.className = 'title';
    ttl.textContent = title;
    card.appendChild(ttl);

    const imgWrap = document.createElement('div');
    card.appendChild(imgWrap);

    loadImageInto(imgWrap, personId, {label:true, gridMode:true}).then(()=>{
      if (clickable){
        card.addEventListener('click', async () => { await loadAnchor(personId); }, { once:true });
      }
    });

    parentEl.appendChild(card);
  }

  // Parents (UP)
  async function handleSwipeUp(){
    if (!$grid || !anchorId) return;
    $grid.innerHTML = '';
    showAnchor(false);
    killEditUI();

    const p1 = getParent1Id(anchorId);

    const row = document.createElement('div');
    row.className = 'parent-row';

    if (p1){
      addCard(row, p1, 'Parent #1', true);
      const p2 = await getParent2Id(p1);
      if (p2) addCard(row, p2, 'Parent #2', true);
      else {
        // Placeholder Parent #2 (not clickable)
        const ph = (await resolveFirstExistingUrl(PLACEHOLDER_PARENT2)) || (await resolveFirstExistingUrl(PLACEHOLDER_MISSING));
        const tmpId = ph ? 'Parent #2 (placeholder)' : 'Parent #2';
        addCard(row, tmpId, 'Parent #2', false);
        // replace image if we had a placeholder asset
        const lastCard = row.lastElementChild;
        if (lastCard){
          const img = lastCard.querySelector('img');
          if (img && ph) img.src = ph;
        }
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

  // Touch handling
  let touchStartX = 0, touchStartY = 0;
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
      if (dx > 0) handleSwipeRight();
    } else if (absY > absX && absY > SWIPE_MIN){
      if (dy < 0) handleSwipeUp();
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
