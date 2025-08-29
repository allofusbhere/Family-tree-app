(function(){
  const qs = (s, el=document) => el.querySelector(s);
  const startInput = qs('#startId');
  const startBtn = qs('#startBtn');
  const spouseBtn = qs('#spouseBtn');
  const backBtn = qs('#backBtn');
  const anchorCard = qs('#anchorCard');
  const img = qs('#anchorImg');

  const HISTORY = [];
  const IMAGES_BASE = "https://allofusbhere.github.io/family-tree-images";
  let SPOUSE_MAP = {};

  async function loadSpouseMap(){
    try {
      const resp = await fetch('spouse_link.json?cb=' + Date.now(), {cache:'no-store'});
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      SPOUSE_MAP = await resp.json();
    } catch (e) {
      console.warn('Spouse map load failed:', e);
      SPOUSE_MAP = {};
    }
  }

  function getHashId() {
    const m = (location.hash || '').match(/id=(\d+(?:\.\d+)?)/);
    return m ? m[1] : null;
  }

  function pushHistory(id){
    if (!HISTORY.length || HISTORY[HISTORY.length-1] !== id) {
      HISTORY.push(id);
      backBtn.disabled = HISTORY.length < 2;
    }
  }

  function setAnchor(id){
    if (!id) return;
    const url = `${IMAGES_BASE}/${id}.jpg?cb=${Date.now()}`;
    anchorCard.classList.remove('has-image');

    const pre = new Image();
    pre.onload = () => {
      img.src = url;
      anchorCard.classList.add('has-image');
      pushHistory(id);
      if (getHashId() !== id) location.hash = `#id=${id}`;
    };
    pre.onerror = () => {
      console.warn('Image failed for', id, url);
      pushHistory(id);
      if (getHashId() !== id) location.hash = `#id=${id}`;
    };
    pre.src = url;
  }

  function handleStart(){
    const id = (startInput.value || '').trim() || getHashId();
    if (id) setAnchor(id);
  }

  function handleBack(){
    if (HISTORY.length < 2) return;
    HISTORY.pop();
    const prev = HISTORY[HISTORY.length-1];
    setAnchor(prev);
  }

  function normalizeMainId(id){
    // Ensure we treat "140000.1" as "140000" for mapping; likewise for any future spouse suffixes
    return String(id).split('.')[0];
  }

  function spouseOf(id){
    const main = normalizeMainId(id);
    return SPOUSE_MAP[main] || null;
  }

  function goSpouse(){
    const current = getHashId() || HISTORY[HISTORY.length-1];
    if (!current) return;
    const partner = spouseOf(current);
    if (partner) setAnchor(partner);
    else console.info('No spouse mapping for', current);
  }

  // Wire up
  startBtn.addEventListener('click', handleStart);
  backBtn.addEventListener('click', handleBack);
  spouseBtn.addEventListener('click', goSpouse);
  startInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleStart(); });

  // Boot
  loadSpouseMap().then(() => {
    const boot = getHashId();
    if (boot) setAnchor(boot);
  });

  window.addEventListener('hashchange', () => {
    const id = getHashId();
    if (id) setAnchor(id);
  });
})();
