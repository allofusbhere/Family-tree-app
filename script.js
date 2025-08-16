
/*
  SwipeTree — script.js (AnchorBG)
  Build: 2025-08-15i
  - Anchor image rendered as background on a centered stage box (no drift)
  - Two-Parent grid on UP; Spouse toggle on RIGHT
  - Anchor hard-hidden when grid opens; tap grid to select & close
  - No edit UI; Default start = 100000
*/

(function(){
  'use strict';

  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  const IMG_BASE = (typeof window !== 'undefined' && window.IMG_BASE) ? window.IMG_BASE : './';
  const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
  const PLACEHOLDER_PARENT2 = 'placeholder_parent2.jpg';
  const PLACEHOLDER_MISSING = 'placeholder.jpg';

  const $anchor = document.getElementById('anchor');
  const $grid = document.getElementById('grid');
  const $startBtn = document.getElementById('startBtn'); // optional

  function killEditUI(){
    const suspects = Array.from(document.querySelectorAll('*'))
      .filter(el => el && el.textContent && /long-press to edit|edit label/i.test(el.textContent));
    suspects.forEach(el => el.remove());
    ['editPanel','labelEditor','edit-label','editor'].forEach(id => { const n = document.getElementById(id); if (n) n.remove(); });
    document.querySelectorAll('.edit,.label-editor,.edit-panel').forEach(n => n.remove());
  }
  killEditUI();

  function showAnchor(show){
    if (!$anchor) return;
    if (show){
      $anchor.style.display = 'grid';
    } else {
      $anchor.innerHTML = '';
      $anchor.style.display = 'none';
    }
  }

  let anchorId = null;

  function buildCandidateUrls(id){ return EXTENSIONS.map(ext => IMG_BASE + id + ext); }
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
    for (const url of candidates){ if (await imageExists(url)) return url; }
    return null;
  }

  function stripAfterFirstDot(id){ const dot = id.indexOf('.'); return dot === -1 ? id : id.slice(0, dot); }
  function isSpouseVariant(id){ return id.includes('.1'); }
  function digitsOnly(id){ return stripAfterFirstDot(id); }
  function toInt(id){ return parseInt(digitsOnly(id), 10); }

  function getParent1Id(id){
    const n = toInt(id);
    if (Number.isNaN(n)) return null;
    const thousandsDigit = Math.floor(n / 1000) % 10;
    if (thousandsDigit !== 0){ return String(n - thousandsDigit * 1000); }
    const tenThousandsDigit = Math.floor(n / 10000) % 10;
    if (tenThousandsDigit !== 0){ return String(n - tenThousandsDigit * 10000); }
    return null;
  }
  async function getParent2Id(parent1Id){
    if (!parent1Id) return null;
    const generic = `${parent1Id}.1`;
    if (await resolveFirstExistingUrl(generic)) return generic;
    return null;
  }

  // Anchor renderer: background stage for perfect centering
  async function renderAnchorStage(container, id){
    if (!container) return false;
    container.innerHTML = '';
    const url = await resolveFirstExistingUrl(id) || (await resolveFirstExistingUrl(PLACEHOLDER_MISSING)) || '';
    const stage = document.createElement('div');
    stage.className = 'stage-bg';
    stage.setAttribute('role', 'img');
    stage.setAttribute('aria-label', id);
    stage.style.backgroundImage = `url('${url}')`;
    container.appendChild(stage);

    // Label below the stage
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = id;
    label.style.marginTop = '10px';
    label.style.fontSize = '16px';
    label.style.opacity = '.9';
    label.style.textAlign = 'center';
    container.appendChild(label);

    // Make sure we’re at the top
    if (typeof window !== 'undefined' && window.scrollTo) { window.scrollTo(0,0); }
    return true;
  }

  async function loadAnchor(id){
    anchorId = id;
    await renderAnchorStage($anchor, id);
    if ($grid) $grid.innerHTML = '';
    showAnchor(true);
    killEditUI();
  }

  async function handleSwipeRight(){
    if (!anchorId) return;
    if (isSpouseVariant(anchorId)){ await loadAnchor(stripAfterFirstDot(anchorId)); return; }
    const spouseId = `${anchorId}.1`;
    if (await resolveFirstExistingUrl(spouseId)){ await loadAnchor(spouseId); }
  }

  function addCard(parentEl, personId, title, clickable=true){
    const card = document.createElement('div');
    card.className = 'card' + (clickable ? ' clickable' : '');

    const ttl = document.createElement('div');
    ttl.className = 'title';
    ttl.textContent = title;
    card.appendChild(ttl);

    const imgWrap = document.createElement('div');
    card.appendChild(imgWrap);

    // Grid still uses <img> (contained by CSS)
    (async () => {
      const url = await resolveFirstExistingUrl(personId) || (await resolveFirstExistingUrl(PLACEHOLDER_MISSING)) || '';
      const img = document.createElement('img');
      img.src = url;
      img.alt = personId;
      img.draggable = false;
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.maxHeight = '42svh';
      img.style.maxHeight = '42vh';
      img.style.objectFit = 'contain';
      imgWrap.appendChild(img);

      const l = document.createElement('div');
      l.className = 'label';
      l.textContent = personId;
      l.style.marginTop = '8px';
      l.style.fontSize = '14px';
      l.style.opacity = '.9';
      l.style.textAlign = 'center';
      card.appendChild(l);

      if (clickable){
        card.addEventListener('click', async () => { await loadAnchor(personId); }, { once:true });
      }
    })();

    parentEl.appendChild(card);
  }

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
      if (p2){ addCard(row, p2, 'Parent #2', true); }
      else {
        const ph = (await resolveFirstExistingUrl(PLACEHOLDER_PARENT2)) || (await resolveFirstExistingUrl(PLACEHOLDER_MISSING));
        const tmpId = ph ? 'Parent #2 (placeholder)' : 'Parent #2';
        addCard(row, tmpId, 'Parent #2', false);
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

  // Touch
  let touchStartX = 0, touchStartY = 0;
  function onTouchStart(e){ const t = e.changedTouches[0]; touchStartX = t.clientX; touchStartY = t.clientY; }
  function onTouchEnd(e){
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    const SWIPE_MIN = 30;
    if (absX > absY && absX > SWIPE_MIN){ if (dx > 0) handleSwipeRight(); }
    else if (absY > absX && absY > SWIPE_MIN){ if (dy < 0) handleSwipeUp(); }
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

  if (document.readyState === 'complete' || document.readyState === 'interactive'){ boot(); }
  else { document.addEventListener('DOMContentLoaded', boot); }
})();
