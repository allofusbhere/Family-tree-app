
// app-hook.js — minimal glue without touching your core app
// Call after your anchor/grid renders & you know the visible IDs.
import { getLabel, getLabelsBatch, setLabel } from './labels.js';

// Example APIs you might already have in your app:
/*
window.SwipeTree = {
  getVisibleIds: () => ({ anchor: '140000', tiles: ['141000','142000'] }),
  setCaption: (id, text) => { ... }, // draw under anchor/tile
  onLongPress: (id, cb) => { ... }   // call cb({name, dob}) to save
};
*/

async function refreshCaptions(){
  if (!window.SwipeTree || !window.SwipeTree.getVisibleIds) return;
  const vis = window.SwipeTree.getVisibleIds();
  const ids = [vis.anchor, ...(vis.tiles||[])].filter(Boolean);
  if (ids.length === 0) return;
  const map = await getLabelsBatch(ids);
  ids.forEach(id => {
    const info = map[id] || {};
    const parts = [info.name, info.dob].filter(Boolean);
    const text = parts.join(' · ');
    if (window.SwipeTree.setCaption) window.SwipeTree.setCaption(id, text);
  });
}

// Wire long‑press edit -> save
function bindEditing(){
  if (!window.SwipeTree || !window.SwipeTree.onLongPress) return;
  window.SwipeTree.onLongPress((id, current) => {
    const name = prompt('Name:', current?.name || '');
    const dob  = prompt('DOB:', current?.dob || '');
    if (name == null && dob == null) return;
    setLabel(id, { name, dob }).then(refreshCaptions).catch(console.error);
  });
}

// Expose helpers so you can call them after each navigation
window.LabelsBridge = { refreshCaptions, bindEditing };

// Try once at load
refreshCaptions();
bindEditing();
