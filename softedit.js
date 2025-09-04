// softedit.js
// Adds long-press "Edit Label" (Name + DOB) overlay and persists via Netlify labels function

(function() {
  const LONG_PRESS_MS = 500;
  let pressTimer, startX, startY;

  function showEditModal(currentId) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '9999';

    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.padding = '20px';
    box.style.borderRadius = '12px';
    box.style.textAlign = 'center';
    box.innerHTML = `
      <h3>Edit Label</h3>
      <label>Name: <input id="softedit-name" type="text" /></label><br/><br/>
      <label>DOB: <input id="softedit-dob" type="date" /></label><br/><br/>
      <button id="softedit-save">Save</button>
      <button id="softedit-cancel">Cancel</button>
    `;
    modal.appendChild(box);
    document.body.appendChild(modal);

    document.getElementById('softedit-cancel').onclick = () => modal.remove();
    document.getElementById('softedit-save').onclick = async () => {
      const name = document.getElementById('softedit-name').value;
      const dob = document.getElementById('softedit-dob').value;
      await fetch('/.netlify/functions/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentId, name, dob })
      });
      modal.remove();
      location.reload();
    };
  }

  function setupLongPress(target, currentId) {
    target.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      pressTimer = setTimeout(() => showEditModal(currentId), LONG_PRESS_MS);
    });
    target.addEventListener('touchend', () => clearTimeout(pressTimer));
    target.addEventListener('touchmove', e => {
      if (Math.abs(e.touches[0].clientX - startX) > 12 || Math.abs(e.touches[0].clientY - startY) > 12) {
        clearTimeout(pressTimer);
      }
    });
  }

  window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.hash.replace('#', ''));
    const currentId = urlParams.get('id') || '100000';
    const img = document.querySelector('#anchorImage, img');
    if (img) {
      setupLongPress(img, currentId);
    }
  });
})();