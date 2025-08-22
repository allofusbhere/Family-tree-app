/* Name overlay: show edited names everywhere, fallback to ID.
   Reads names from localStorage:
     - 'swipetree:label:<ID>' (per-ID keys), or
     - 'labels' JSON map { "<ID>": "Name", ... }
*/
(function(){
  'use strict';
  function getNameFor(id){
    try {
      const k = `swipetree:label:${id}`;
      const v = localStorage.getItem(k);
      if (v && v.trim()) return v.trim();
      const dictRaw = localStorage.getItem('labels');
      if (dictRaw) {
        const dict = JSON.parse(dictRaw);
        if (dict && dict[id]) return String(dict[id]).trim();
      }
    } catch(e){}
    return '';
  }
  function parseIdFrom(el){
    if (!el) return null;
    const a = el.getAttribute && (el.getAttribute('data-id') || el.getAttribute('data-person-id') || el.getAttribute('data-label-id'));
    if (a && /^\d{5,}$/.test(a)) return a;
    const t = (el.textContent || '').trim();
    if (/^\d{5,}$/.test(t)) return t;
    return null;
  }
  function ensureNameEl(fromEl){
    let container = fromEl.closest && (fromEl.closest('.tile, .label, .person, .card')) || fromEl.parentElement || fromEl;
    let nameEl = container.querySelector && container.querySelector('.name, .person-name');
    if (!nameEl) {
      nameEl = document.createElement('div');
      nameEl.className = 'name';
      container.appendChild(nameEl);
    }
    return nameEl;
  }
  function apply(root){
    const nodes = root.querySelectorAll ? root.querySelectorAll('[data-id],[data-person-id],[data-label-id],.id') : [];
    nodes.forEach(el => {
      const id = parseIdFrom(el);
      if (!id) return;
      const nm = getNameFor(id) || id;
      const nameEl = ensureNameEl(el);
      nameEl.textContent = nm;
      if (el.matches && el.matches('.id')) el.style.display = 'none';
    });
    // Also update anchor name if present
    const anchorIdEl = document.getElementById('anchorId');
    const anchorNameEl = document.getElementById('anchorName');
    if (anchorIdEl && anchorNameEl) {
      const idText = (anchorIdEl.textContent || '').trim();
      if (/^\d{5,}$/.test(idText)) {
        const nm = getNameFor(idText) || idText;
        anchorNameEl.textContent = nm;
        anchorIdEl.style.display = 'none';
      }
    }
  }
  function init(){
    apply(document);
    const mo = new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType === 1) apply(n);
      }));
    });
    mo.observe(document.body, {childList:true, subtree:true});
    window.addEventListener('storage', () => apply(document));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();