/*!
 * SoftEdit v1.1 — long-press "Edit Label" (Name, DOB) on iOS/desktop without touching swipe code.
 * Scope-safe: adds listeners to the main portrait image (by #anchorImage, then largest <img> as fallback).
 * Caches are defeated with a timestamp param; iOS callout/share is suppressed while our gesture is active.
 */
(function () {
  const NETLIFY_FN = '/.netlify/functions/labels';
  const PRESS_MS = 550;            // long-press threshold
  const MOVE_TOL = 10;             // px movement allowed during press
  const MODAL_ID = 'softedit-modal';
  const NO_CALL_OUT_CSS = `
    #${MODAL_ID} { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; 
      background: rgba(0,0,0,.55); z-index: 999999; -webkit-touch-callout:none; }
    #${MODAL_ID}.open { display: flex; }
    #${MODAL_ID} .card { width: min(92vw, 420px); background: #121212; color: #e6e6e6; 
      border-radius: 14px; padding: 18px; box-shadow: 0 12px 40px rgba(0,0,0,.55); font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    #${MODAL_ID} label { display:block; font-size: 13px; opacity:.8; margin: 8px 4px 4px; }
    #${MODAL_ID} input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #2a2a2a; background: #1b1b1b; color: #fff; font-size: 15px; }
    #${MODAL_ID} .row { display:flex; gap:10px; margin-top: 14px; }
    #${MODAL_ID} button { flex:1; padding: 10px 14px; border-radius: 10px; border: 0; cursor:pointer; font-weight: 600; }
    #${MODAL_ID} .cancel { background:#2a2a2a; color:#e6e6e6; }
    #${MODAL_ID} .save { background:#3b82f6; color:#fff; }
    img, #anchorImage, body { -webkit-user-select: none; -webkit-touch-callout: none; }
  `;

  function injectStyle(css) {
    const el = document.createElement('style');
    el.setAttribute('data-softedit', '1');
    el.textContent = css;
    document.head.appendChild(el);
  }

  function getPersonId() {
    // 1) URL hash #id=123
    const h = String(location.hash || '');
    const m = h.match(/(?:^|#|&)id=(\d+)/i);
    if (m) return m[1];

    // 2) Image filename .../images/12345.jpg
    const img = targetImage();
    if (img && img.currentSrc) {
      const m2 = img.currentSrc.match(/\/(\d+)\.[a-z]+(?:\?|$)/i);
      if (m2) return m2[1];
    }

    // 3) Global hook if the app sets it
    if (window.currentId && /^\d+$/.test(String(window.currentId))) return String(window.currentId);

    return null;
  }

  function cacheBust(url) {
    const u = new URL(url, location.origin);
    u.searchParams.set('t', Date.now());
    return u.toString();
  }

  async function fetchLabel(id) {
    const url = cacheBust(`${NETLIFY_FN}?id=${encodeURIComponent(id)}`);
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) throw new Error(`GET ${res.status}`);
    return res.json();
  }

  async function saveLabel(id, payload) {
    const url = cacheBust(`${NETLIFY_FN}?id=${encodeURIComponent(id)}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`POST ${res.status}`);
    return res.json();
  }

  function ensureModal() {
    let wrap = document.getElementById(MODAL_ID);
    if (wrap) return wrap;
    wrap = document.createElement('div');
    wrap.id = MODAL_ID;
    wrap.innerHTML = `
      <div class="card">
        <div style="font-size:16px; font-weight:700; margin-bottom:6px;">Edit Label</div>
        <label for="se_name">Name</label>
        <input id="se_name" placeholder="Full name" autocomplete="name" />
        <label for="se_dob" style="margin-top:10px;">DOB</label>
        <input id="se_dob" placeholder="YYYY-MM-DD" inputmode="numeric" />
        <div class="row">
          <button class="cancel" type="button">Cancel</button>
          <button class="save" type="button">Save</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (e) => { if (e.target === wrap) closeModal(); });
    wrap.querySelector('.cancel').addEventListener('click', closeModal);
    wrap.querySelector('.save').addEventListener('click', async () => {
      const id = getPersonId(); if (!id) return closeModal();
      const name = wrap.querySelector('#se_name').value.trim();
      const dob = wrap.querySelector('#se_dob').value.trim();
      try {
        await saveLabel(id, { id, name, dob });
        // Re-fetch to warm caches; app will pick it up on its own flow.
        await fetchLabel(id).catch(()=>{});
      } catch (e) {
        console.warn('SoftEdit save failed', e);
      } finally {
        closeModal();
      }
    });
    return wrap;
  }
  function openModal(prefill) {
    const wrap = ensureModal();
    wrap.querySelector('#se_name').value = prefill?.name || '';
    wrap.querySelector('#se_dob').value = prefill?.dob || '';
    wrap.classList.add('open');
  }
  function closeModal() {
    const wrap = document.getElementById(MODAL_ID);
    if (wrap) wrap.classList.remove('open');
  }

  function targetImage() {
    // Prefer an explicitly marked image if present
    const anchor = document.getElementById('anchorImage');
    if (anchor && anchor.tagName === 'IMG') return anchor;
    // Fallback: pick the largest visible IMG (by area)
    const imgs = Array.from(document.images || [])
      .filter(im => im.width && im.height && im.offsetParent !== null);
    if (!imgs.length) return null;
    imgs.sort((a,b)=> (b.naturalWidth*b.naturalHeight) - (a.naturalWidth*a.naturalHeight));
    return imgs[0];
  }

  function setupGesture(img) {
    if (!img || img.__softedit) return;
    img.__softedit = true;

    let downX=0, downY=0, timer=null, pressed=false;

    // Prevent iOS callout while finger is down
    const supressContext = (e)=> e.preventDefault();

    const start = (e) => {
      const pt = e.touches ? e.touches[0] : e;
      downX = pt.clientX; downY = pt.clientY; pressed = true;
      img.addEventListener('contextmenu', supressContext, { passive:false });
      timer = setTimeout(async () => {
        if (!pressed) return;
        // Long-press confirmed
        const id = getPersonId();
        let existing = { name:'', dob:'' };
        if (id) {
          try { existing = await fetchLabel(id); } catch {}
        }
        openModal(existing);
      }, PRESS_MS);
    };
    const move = (e) => {
      if (!pressed) return;
      const pt = e.touches ? e.touches[0] : e;
      if (Math.abs(pt.clientX - downX) > MOVE_TOL || Math.abs(pt.clientY - downY) > MOVE_TOL) {
        cancel(e);
      }
    };
    const end = (e) => { cancel(e); };
    const cancel = (e) => {
      pressed = false;
      clearTimeout(timer);
      timer = null;
      img.removeEventListener('contextmenu', supressContext);
    };

    img.addEventListener('touchstart', start, { passive:true });
    img.addEventListener('touchmove', move, { passive:true });
    img.addEventListener('touchend', end, { passive:true });
    img.addEventListener('touchcancel', end, { passive:true });

    img.addEventListener('mousedown', start);
    img.addEventListener('mousemove', move);
    img.addEventListener('mouseleave', end);
    img.addEventListener('mouseup', end);
  }

  function boot() {
    injectStyle(NO_CALL_OUT_CSS);
    const tryBind = () => {
      const img = targetImage();
      if (img) setupGesture(img);
    };
    tryBind();
    // Rebind on DOM swaps
    const mo = new MutationObserver(tryBind);
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
