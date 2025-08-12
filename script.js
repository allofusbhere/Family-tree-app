// SwipeTree — Full Replacement (2025-08-12)
// Baseline behaviors + swipe gestures mapped to button actions.
(function(){
  const q = (sel, el=document) => el.querySelector(sel);
  const grid = q('#grid');
  const anchorWrap = q('#anchorWrap');
  const anchorImg  = q('#anchorImg');
  const anchorLabel= q('#anchorLabel');

  const btnStart = q('#btnStart');
  const btnBack = q('#btnBack');
  const btnParent = q('#btnParent');
  const btnSiblings = q('#btnSiblings');
  const btnChildren = q('#btnChildren');

  const exts = ['.jpg', '.JPG', '.jpeg', '.png', '.PNG', '.JPEG'];
  let anchorId = null;
  let historyStack = [];

  function countTrailingZeros(n){
    const s = String(n);
    let c = 0;
    for (let i = s.length-1; i >= 0; i--) { if (s[i]==='0') c++; else break; }
    return c;
  }
  const pow10 = k => Math.pow(10,k);

  function getChildrenIds(parentId){
    const tz = countTrailingZeros(parentId);
    if (tz <= 0) return [];
    const inc = pow10(tz - 1);
    const out = [];
    for (let k = 1; k <= 9; k++) out.push(parentId + k*inc);
    return out;
  }

  function getParentId(id){
    const tz = countTrailingZeros(id);
    const block = pow10(tz + 1);
    const parent = Math.floor(id / block) * block;
    return parent === id ? null : parent;
  }

  function getSiblingsIds(id){
    const parent = getParentId(id);
    if (!parent) return [];
    const tzParent = countTrailingZeros(parent);
    const inc = pow10(tzParent - 1);
    const out = [];
    for (let k = 1; k <= 9; k++){
      const sib = parent + k*inc;
      if (sib !== id) out.push(sib);
    }
    return out;
  }

  function tryLoadImage(id, el){
    let idx = 0;
    function tryNext(){
      if (idx >= exts.length){
        el.dataset.missing = "1";
        el.src = "";
        el.parentElement?.classList.add('hidden');
        return;
      }
      const url = `${id}${exts[idx]}`;
      el.onerror = () => { idx++; tryNext(); };
      el.onload  = () => { el.dataset.missing = "0"; el.parentElement?.classList.remove('hidden'); };
      el.src = url;
    }
    tryNext();
  }

  function setAnchor(id, pushHistory=true){
    if (anchorId && pushHistory){
      historyStack.push(anchorId);
      btnBack.disabled = historyStack.length === 0;
    }
    anchorId = id;
    grid.classList.add('hidden');
    anchorWrap.classList.remove('hidden');

    btnParent.disabled = getParentId(anchorId) == null;
    btnSiblings.disabled = false;
    btnChildren.disabled = false;

    anchorWrap.classList.remove('highlight');
    tryLoadImage(anchorId, anchorImg);
  }

  function showGrid(ids, tagLabel){
    anchorWrap.classList.add('hidden');
    grid.innerHTML = "";
    ids.slice(0,9).forEach((id, i) => {
      const card = document.createElement('div');
      card.className = 'grid-card';
      const img = document.createElement('img');
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.textContent = `${tagLabel} ${i+1}`;
      card.appendChild(img);
      card.appendChild(tag);
      grid.appendChild(card);
      tryLoadImage(id, img);
      card.addEventListener('click', (e) => { e.stopPropagation(); setAnchor(id, true); }, {passive:true});
    });
    grid.classList.remove('hidden');
  }

  // Buttons
  btnStart.addEventListener('click', () => {
    const v = prompt("Enter starting ID (e.g., 140000):", anchorId ?? "");
    if (!v) return;
    const id = parseInt(String(v).replace(/\D/g, ""), 10);
    if (!Number.isFinite(id)) return;
    setAnchor(id, false);
  });

  btnBack.addEventListener('click', () => {
    if (historyStack.length === 0) return;
    const prev = historyStack.pop();
    btnBack.disabled = historyStack.length === 0;
    setAnchor(prev, false);
  });

  btnParent.addEventListener('click', () => {
    const p = getParentId(anchorId);
    if (p) setAnchor(p, true);
  });

  btnSiblings.addEventListener('click', () => showGrid(getSiblingsIds(anchorId), "Sibling"));
  btnChildren.addEventListener('click', () => showGrid(getChildrenIds(anchorId), "Child"));

  // Swipes (only when grid hidden)
  let sx=0, sy=0, st=0;
  const SWIPE_MIN_DIST = 40, SWIPE_MAX_TIME = 800, SWIPE_DIR_RATIO = 1.25;
  function onTouchStart(e){ const t=e.changedTouches[0]; sx=t.clientX; sy=t.clientY; st=Date.now(); }
  function onTouchEnd(e){
    const gridHidden = grid.classList.contains('hidden');
    if (!gridHidden) return;
    const t=e.changedTouches[0];
    const dx=t.clientX-sx, dy=t.clientY-sy, dt=Date.now()-st;
    if (dt>SWIPE_MAX_TIME) return;
    const ax=Math.abs(dx), ay=Math.abs(dy);
    if (ax<SWIPE_MIN_DIST && ay<SWIPE_MIN_DIST) return;
    if (ax>ay*SWIPE_DIR_RATIO){
      if (dx<0){ btnSiblings.click(); } // left
    } else if (ay>ax*SWIPE_DIR_RATIO){
      if (dy>0){ btnChildren.click(); } // down
      else { btnParent.click(); }       // up
    }
  }
  const stage=document.getElementById('stage');
  stage.addEventListener('touchstart', onTouchStart, {passive:true});
  stage.addEventListener('touchend', onTouchEnd, {passive:true});

  // Anchor taps
  anchorWrap.addEventListener('click', () => {
    if (!grid.classList.contains('hidden')) return;
    anchorWrap.classList.add('highlight');
    setTimeout(() => anchorWrap.classList.remove('highlight'), 250);
  }, {passive:true});

  anchorWrap.addEventListener('dblclick', () => {
    if (!grid.classList.contains('hidden')) return;
    const existing = localStorage.getItem(`name:${anchorId}`) || "";
    const name = prompt("Edit name (stored locally):", existing);
    if (name !== null){
      localStorage.setItem(`name:${anchorId}`, name);
      anchorLabel.textContent = name;
      anchorLabel.style.display = name ? 'block' : 'none';
    }
  });
})();