(function(){
  const qs = (s, el=document) => el.querySelector(s);
  const startInput = qs('#startId');
  const startBtn = qs('#startBtn');
  const backBtn = qs('#backBtn');
  const anchorCard = qs('#anchorCard');
  const img = qs('#anchorImg');
  const placeholder = qs('#anchorPlaceholder');

  const HISTORY = [];
  const IMAGES_BASE = "https://allofusbhere.github.io/family-tree-images";

  function getHashId() {
    const hash = location.hash || "";
    const m = hash.match(/id=(\d+(?:\.\d+)?)/);
    return m ? m[1] : null;
  }

  function pushHistory(id) {
    if (!HISTORY.length || HISTORY[HISTORY.length-1] !== id) {
      HISTORY.push(id);
      backBtn.disabled = HISTORY.length < 2;
    }
  }

  function setAnchor(id) {
    if (!id) return;
    const cb = Date.now(); // cache-bust images hard
    const url = `${IMAGES_BASE}/${id}.jpg?cb=${cb}`;

    // show placeholder until the new image is confirmed loaded
    anchorCard.classList.remove('has-image');
    img.style.display = 'none';

    // Create a temp Image to ensure load success before swapping
    const pre = new Image();
    pre.onload = () => {
      img.src = url;
      anchorCard.classList.add('has-image');
      img.style.display = 'block';
      pushHistory(id);
      location.hash = `#id=${id}`;
    };
    pre.onerror = () => {
      // If failing to load, show placeholder but still update hash so user sees change
      console.warn('Failed to load image for', id, url);
      anchorCard.classList.remove('has-image');
      pushHistory(id);
      location.hash = `#id=${id}`;
    };
    pre.src = url;
  }

  function handleStart() {
    const id = (startInput.value || "").trim() || getHashId();
    if (id) setAnchor(id);
  }

  function handleBack() {
    if (HISTORY.length < 2) return;
    HISTORY.pop(); // current
    const prev = HISTORY[HISTORY.length-1];
    setAnchor(prev);
  }

  // Wire up UI
  startBtn.addEventListener('click', handleStart);
  backBtn.addEventListener('click', handleBack);
  startInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleStart(); });

  // On load, take id from URL hash if present, otherwise wait for Start
  const bootId = getHashId();
  if (bootId) setAnchor(bootId);

  // Also respond if hash changes (e.g., manual edit)
  window.addEventListener('hashchange', () => {
    const id = getHashId();
    if (id) setAnchor(id);
  });
})();
