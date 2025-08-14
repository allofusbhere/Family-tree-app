(() => {
  const { IMAGE_BASE, LABELS_URL, SAVE_URL } = window.__CONFIG__;
  const els = {
    card: document.getElementById('card'),
    img: document.getElementById('photo'),
    name: document.getElementById('name'),
    dob: document.getElementById('dob'),
    hint: document.getElementById('hint'),
    toast: document.getElementById('toast'),
    dlg: document.getElementById('editDialog'),
    form: document.getElementById('editForm'),
    inpName: document.getElementById('inpName'),
    inpDob: document.getElementById('inpDob'),
    btnStart: document.getElementById('btnStart'),
    btnBack: document.getElementById('btnBack'),
  };

  // State
  let currentId = 140000;  // default anchor for test
  let labels = {};
  let editArmed = true;    // modal opens only on long-press when armed
  let touchStart = 0;
  let spouseOffset = 0;    // swipe toggles spouse (+1/-1 demo)

  function toast(msg, ms = 1400) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    setTimeout(() => els.toast.classList.add('hidden'), ms);
  }

  async function loadLabels() {
    try {
      const res = await fetch(LABELS_URL, { cache: "no-store" });
      if (res.ok) {
        labels = await res.json();
      } else {
        labels = {};
      }
    } catch {
      labels = {};
    }
  }

  function render() {
    const id = currentId + spouseOffset * 1; // dummy spouse toggle
    const srcJpg = `${IMAGE_BASE}/${id}.jpg`;
    const srcJPG = `${IMAGE_BASE}/${id}.JPG`;
    els.img.src = srcJpg;
    els.img.onerror = () => { els.img.onerror = null; els.img.src = srcJPG; };

    const meta = labels[id] || labels[currentId] || {};
    els.name.textContent = meta.name || "Anchor person";
    els.dob.textContent  = meta.dob  || "";
    els.card.classList.remove('hidden');
  }

  async function init() {
    await loadLabels();
    render();
  }

  // Long-press edit only
  function armEditOnce() { editArmed = true; }
  function onPressStart() { touchStart = Date.now(); }
  function onPressEnd() {
    const dt = Date.now() - touchStart;
    if (dt >= 550 && editArmed) {
      openEdit();
    }
    touchStart = 0;
  }
  function openEdit() {
    const id = currentId + spouseOffset * 1;
    const meta = labels[id] || {};
    els.inpName.value = meta.name || "";
    els.inpDob.value  = meta.dob  || "";
    els.dlg.showModal();
    editArmed = false; // disarm until next long-press
  }
  async function saveEdit() {
    const id = currentId + spouseOffset * 1;
    const name = els.inpName.value.trim();
    const dob  = els.inpDob.value.trim();
    labels[id] = { name, dob };
    render();
    try {
      const res = await fetch(SAVE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, dob })
      });
      if (!res.ok) {
        const t = await res.text();
        toast("Save failed");
        console.error("Save error:", t);
      } else {
        toast("Saved");
      }
    } catch (e) {
      toast("Offline? — saved locally");
      console.warn(e);
    }
  }

  // Swipe spouse
  let swipeX = 0;
  function onTouchStart(e) {
    swipeX = e.touches ? e.touches[0].clientX : e.clientX;
    onPressStart();
  }
  function onTouchEnd(e) {
    const x2 = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) || swipeX;
    const dx = x2 - swipeX;
    if (Math.abs(dx) > 60) {
      spouseOffset = spouseOffset === 0 ? (dx > 0 ? 1 : -1) : 0;
      render();
      return;
    }
    onPressEnd();
  }

  // Events
  els.card.addEventListener('mousedown', onTouchStart);
  els.card.addEventListener('mouseup', onTouchEnd);
  els.card.addEventListener('touchstart', onTouchStart, { passive: true });
  els.card.addEventListener('touchend', onTouchEnd);

  els.btnStart.addEventListener('click', () => { armEditOnce(); toast("Long-press to edit"); });
  els.btnBack.addEventListener('click', () => { spouseOffset = 0; render(); });

  document.getElementById('btnSave').addEventListener('click', async (e) => {
    e.preventDefault();
    await saveEdit();
    els.dlg.close(); // stays closed; must long-press again to reopen
  });
  document.getElementById('btnCancel').addEventListener('click', (e) => {
    e.preventDefault();
    els.dlg.close();
  });

  // Keyboard helpers
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'e') { openEdit(); }
    if (e.key === 'Escape') { els.dlg.open && els.dlg.close(); }
  });

  init();
})();