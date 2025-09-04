
/*! softedit.js — Drop-in long-press editor (Name + DOB) for Family-tree-app
 *  Scope: non-invasive, adds overlay and Netlify labels GET/POST with cache-busting.
 *  v1.2 (iOS callout suppression + robust long-press target detection)
 */
(function(){
  const TS = () => Date.now().toString();

  // --- CONFIG (lightly opinionated defaults; adjust only if needed) ---
  const FN_PATH = '/.netlify/functions/labels';   // Canonical Netlify function
  const PRESS_MS = 520;                            // Long-press threshold
  const DOB_PLACEHOLDER = 'YYYY-MM-DD';

  // --- Utilities ---
  function byId(id){ try { return document.getElementById(id);} catch(_) { return null; } }
  function qs(sel, root=document){ try { return root.querySelector(sel);} catch(_) { return null; } }
  function qsa(sel, root=document){ try { return Array.from(root.querySelectorAll(sel)); } catch(_) { return []; } }

  function parseIdFromHash() {
    // Accept formats: #id=100000, #100000, #person-100000
    const h = window.location.hash || '';
    const m1 = h.match(/id=(\d+)/i);
    if (m1) return m1[1];
    const m2 = h.match(/#(\d{2,})$/);
    if (m2) return m2[1];
    const m3 = h.match(/(\d{2,})/);
    if (m3) return m3[1];
    return null;
  }

  function largestVisibleImage() {
    let imgs = qsa('img');
    imgs = imgs.filter(img => {
      const r = img.getBoundingClientRect();
      return r.width > 32 && r.height > 32 && r.bottom > 0 && r.right > 0 && r.left < window.innerWidth && r.top < window.innerHeight;
    });
    if (!imgs.length) return null;
    imgs.sort((a,b)=> (b.naturalWidth*b.naturalHeight) - (a.naturalWidth*a.naturalHeight));
    return imgs[0];
  }

  function css(strings){ const s = strings[0]; const tag = document.createElement('style'); tag.setAttribute('data-softedit', ''); tag.textContent = s; document.head.appendChild(tag); }

  // --- Inject minimal CSS (scoped) + iOS callout suppression ---
  css`
  /* Scope only to the chosen target & overlay to avoid touching swipe logic */
  .softedit-target, .softedit-target img {
    -webkit-touch-callout: none !important; /* iOS: disable long-press image sheet */
    touch-action: manipulation;
  }
  .softedit-label {
    text-align: center; color: #ddd; font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif;
    margin-top: 10px; line-height: 1.15; font-size: 14px; text-shadow: 0 1px 2px rgba(0,0,0,0.35);
  }
  .softedit-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 9999;
    display: flex; align-items: center; justify-content: center;
  }
  .softedit-modal {
    width: min(92vw, 420px); background: #1f1f1f; border-radius: 14px; padding: 18px 16px 14px;
    color: #eee; box-shadow: 0 10px 40px rgba(0,0,0,0.45);
    font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif;
  }
  .softedit-modal h3 { margin: 0 0 10px; font-weight: 600; font-size: 16px; }
  .softedit-field { display: grid; gap: 6px; margin: 10px 0 8px; }
  .softedit-field label { font-size: 12px; opacity: .85; }
  .softedit-field input {
    width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px;
    border: 1px solid #3a3a3a; background: #111; color: #f3f3f3; outline: none;
  }
  .softedit-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
  .softedit-btn {
    padding: 10px 14px; border-radius: 10px; border: 1px solid #444;
    background: #2a2a2a; color: #fff; cursor: pointer;
  }
  .softedit-btn.primary { background: #3b82f6; border-color: #3b82f6; }
  .softedit-hidden { display: none !important; }
  `;

  // --- Modal factory ---
  function createModal() {
    const backdrop = document.createElement('div'); backdrop.className = 'softedit-backdrop softedit-hidden';
    const modal = document.createElement('div'); modal.className = 'softedit-modal';
    modal.innerHTML = `
      <h3>Edit Label</h3>
      <div class="softedit-field"><label>Name</label><input id="se_name" placeholder="Full name" autocomplete="off"></div>
      <div class="softedit-field"><label>DOB</label><input id="se_dob" placeholder="${DOB_PLACEHOLDER}" inputmode="numeric" autocomplete="off"></div>
      <div class="softedit-actions">
        <button class="softedit-btn" id="se_cancel">Cancel</button>
        <button class="softedit-btn primary" id="se_save">Save</button>
      </div>`;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    return { backdrop, name: modal.querySelector('#se_name'), dob: modal.querySelector('#se_dob'),
             saveBtn: modal.querySelector('#se_save'), cancelBtn: modal.querySelector('#se_cancel') };
  }

  function show(el){ el.classList.remove('softedit-hidden'); }
  function hide(el){ el.classList.add('softedit-hidden'); }

  // --- Data I/O ---
  async function fetchLabel(personId) {
    const url = `${FN_PATH}?id=${encodeURIComponent(personId)}&t=${TS()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('GET failed');
    return res.json();
  }
  async function saveLabel(personId, data) {
    const url = `${FN_PATH}?id=${encodeURIComponent(personId)}&t=${TS()}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ id: personId, ...data })
    });
    if (!res.ok) throw new Error('POST failed');
    return res.json();
  }

  // --- Label renderer under image (non-invasive) ---
  function ensureLabelUnder(target) {
    let box = target.nextElementSibling;
    if (!box || !box.classList || !box.classList.contains('softedit-label')) {
      box = document.createElement('div');
      box.className = 'softedit-label';
      target.insertAdjacentElement('afterend', box);
    }
    return box;
  }
  function render(box, name, dob) {
    const year = (dob||'').match(/^(\d{4})/)?.[1] || '';
    box.textContent = [name||'', year||''].filter(Boolean).join('\n');
  }

  // --- Long press wiring ---
  function wireLongPress(target, onPress) {
    let timer = null;
    const start = (e) => {
      // Prevent iOS context/callout aggressively
      if (e.type === 'touchstart') {
        if (e.touches && e.touches.length > 1) return; // ignore multi-touch
      }
      timer = setTimeout(()=> onPress(e), PRESS_MS);
    };
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };

    // Prevent iOS image callout/context menu
    target.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); }, { passive:false });
    target.addEventListener('gesturestart', cancel, { passive:true });

    target.addEventListener('touchstart', start, { passive:true });
    target.addEventListener('touchend', cancel, { passive:true });
    target.addEventListener('touchcancel', cancel, { passive:true });
    target.addEventListener('mousedown', start, { passive:true });
    target.addEventListener('mouseup', cancel, { passive:true });
    target.addEventListener('mouseleave', cancel, { passive:true });
  }

  // --- Boot ---
  function boot() {
    // Identify target image
    let target = qs('#anchor, #anchorImage, [data-softedit-target]');
    if (!target) target = largestVisibleImage();
    if (!target) return; // Nothing to do

    // Mark & suppress iOS callout on this specific element
    target.classList.add('softedit-target');
    target.setAttribute('draggable', 'false'); // reduce callout likelihood

    const labelBox = ensureLabelUnder(target);

    // Determine person id
    const personId = parseIdFromHash();
    if (!personId) {
      // still render empty label box to keep layout stable
      render(labelBox, '', '');
    } else {
      fetchLabel(personId).then(rec => {
        render(labelBox, rec.name||'', rec.dob||'');
      }).catch(()=>{
        render(labelBox, '', '');
      });
    }

    // Modal
    const modal = createModal();

    const openEditor = async () => {
      if (!personId) return; // cannot edit without id context
      try {
        const rec = await fetchLabel(personId);
        modal.name.value = rec.name || '';
        modal.dob.value = rec.dob || '';
      } catch(_) {
        modal.name.value = ''; modal.dob.value = '';
      }
      show(modal.backdrop);
      modal.name.focus();
    };

    modal.cancelBtn.addEventListener('click', ()=> hide(modal.backdrop));
    modal.backdrop.addEventListener('click', (e)=> { if (e.target === modal.backdrop) hide(modal.backdrop); });

    modal.saveBtn.addEventListener('click', async ()=>{
      const payload = {
        name: modal.name.value.trim(),
        dob: modal.dob.value.trim()
      };
      try {
        await saveLabel(personId, payload);
        // Re-fetch to defeat caches and re-render
        const rec = await fetchLabel(personId);
        render(labelBox, rec.name||payload.name, rec.dob||payload.dob);
      } catch(_){ /* swallow */ }
      hide(modal.backdrop);
    });

    wireLongPress(target, openEditor);
  }

  // Boot once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
})();
