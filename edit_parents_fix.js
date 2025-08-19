
// SwipeTree — SoftEdit + Parents Centering Fix (drop-in)
// Attach after your existing script.js
(function () {
  const STORAGE_PREFIX = "swipetree:label:";
  const LONG_PRESS_MS = 550;

  // ---------- Utilities ----------
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function getIdFromEl(card) {
    // Tries common places we use for IDs
    if (!card) return null;
    const el = card.querySelector("[data-id]") || card;
    return el.getAttribute("data-id") || el.dataset.id || card.getAttribute("data-person-id") || null;
  }
  function getLabelKey(id) { return STORAGE_PREFIX + String(id); }
  function loadLabel(id) { try { return localStorage.getItem(getLabelKey(id)); } catch { return null; } }
  function saveLabel(id, val) { try { localStorage.setItem(getLabelKey(id), val||""); } catch {} }
  function ensureNameLabel(card) {
    let label = card.querySelector(".name-label");
    if (!label) {
      label = document.createElement("div");
      label.className = "name-label";
      card.appendChild(label);
    }
    return label;
  }

  // ---------- Render stored labels on any visible person cards ----------
  function renderStoredLabels(root) {
    $all(".person-card", root || document).forEach(card => {
      const id = getIdFromEl(card);
      if (!id) return;
      const saved = loadLabel(id);
      if (saved != null && saved !== "") {
        ensureNameLabel(card).textContent = saved;
      }
    });
  }

  // Re-render on overlay open events if app dispatches a custom event; also periodically as a fallback.
  document.addEventListener("swipetree:overlay:open", () => renderStoredLabels());
  window.addEventListener("load", () => renderStoredLabels());
  const _labelInterval = setInterval(() => renderStoredLabels(), 800);

  // ---------- Long-press SoftEdit (no hint text) ----------
  function attachLongPressEditing() {
    let pressTimer = null;
    let pressedCard = null;

    function startPress(e) {
      const card = e.currentTarget;
      pressedCard = card;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => openInlineEditor(card), LONG_PRESS_MS);
    }
    function cancelPress() {
      clearTimeout(pressTimer);
      pressTimer = null;
      pressedCard = null;
    }

    function openInlineEditor(card) {
      const id = getIdFromEl(card);
      if (!id) return;
      const labelEl = ensureNameLabel(card);
      const existing = labelEl.textContent || loadLabel(id) || "";

      // Build lightweight inline editor
      const wrapper = document.createElement("div");
      wrapper.className = "inline-editor";
      wrapper.innerHTML = `
        <input class="inline-editor-input" type="text" maxlength="40" placeholder="Name" value="${existing.replace(/"/g, '&quot;')}" />
        <button class="inline-editor-save" type="button">Save</button>
        <button class="inline-editor-cancel" type="button">Cancel</button>
      `;

      // Remove any previous editor on this card
      card.querySelectorAll(".inline-editor").forEach(n => n.remove());
      card.appendChild(wrapper);

      const input = $(".inline-editor-input", wrapper);
      const saveBtn = $(".inline-editor-save", wrapper);
      const cancelBtn = $(".inline-editor-cancel", wrapper);

      // Focus and select text for quick replace
      setTimeout(() => { input.focus(); input.select(); }, 0);

      function commit() {
        const val = input.value.trim();
        labelEl.textContent = val;
        saveLabel(id, val);
        wrapper.remove();
      }
      function cancel() {
        wrapper.remove();
      }

      saveBtn.addEventListener("click", commit);
      cancelBtn.addEventListener("click", cancel);
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") commit();
        if (ev.key === "Escape") cancel();
      });
    }

    // Bind to any clickable person card/image
    function bindTargets(root) {
      $all(".person-card, .person-image", root || document).forEach(el => {
        // Avoid duplicate listeners
        if (el.__st_longpress_bound) return;
        el.__st_longpress_bound = true;

        // Touch (iPad)
        el.addEventListener("touchstart", startPress, { passive: true });
        el.addEventListener("touchend", cancelPress);
        el.addEventListener("touchmove", cancelPress);
        el.addEventListener("touchcancel", cancelPress);

        // Mouse (desktop testing)
        el.addEventListener("mousedown", startPress);
        el.addEventListener("mouseup", cancelPress);
        el.addEventListener("mouseleave", cancelPress);
      });
    }

    bindTargets();
    // Rebind occasionally in case cards are re-rendered
    const _bindInterval = setInterval(() => bindTargets(), 800);
  }

  attachLongPressEditing();

  // ---------- Parents Grid Centering ----------
  function centerParentsGrid() {
    // Expect an overlay for parents with data-type="parents" or id #parentsGrid
    const parentsOverlays = [
      ...$all('.overlay[data-type="parents"]'),
      ...$all('#parentsGrid')
    ];

    parentsOverlays.forEach(ov => {
      // Apply centering styles defensively
      ov.classList.add("parents-centered-overlay");
      const grid = ov.querySelector(".grid") || ov;
      grid.classList.add("parents-centered-grid");

      // If 1 or 2 parents, ensure tight centering with equal gaps
      const items = $all(".person-card, .grid-item", grid);
      if (items.length <= 2) {
        grid.classList.add("parents-grid-two");
      } else {
        grid.classList.remove("parents-grid-two");
      }
    });
  }

  // Try on load and when overlays are opened
  window.addEventListener("load", centerParentsGrid);
  document.addEventListener("swipetree:overlay:open", centerParentsGrid);
  // Poll as fallback in case the app doesn't dispatch events
  const _parentsInterval = setInterval(centerParentsGrid, 600);

  // ---------- Overlay Close Helper ----------
  function attachOverlayClose() {
    // Any element with [data-overlay-close] will close the nearest .overlay
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-overlay-close]");
      if (!btn) return;
      const overlay = btn.closest(".overlay");
      if (overlay) {
        overlay.classList.add("hidden");
        overlay.setAttribute("aria-hidden", "true");
        // Optional: dispatch an event
        overlay.dispatchEvent(new CustomEvent("overlay:closed", { bubbles: true }));
      }
    });
  }
  attachOverlayClose();

})();
