
// labels.js — client helper for Netlify function
const BASE = '/.netlify/functions/labels';
export async function getLabel(id){
  const res = await fetch(`${BASE}?id=${encodeURIComponent(id)}`, { method:'GET' });
  if(!res.ok) return null;
  return res.json();
}
export async function getLabelsBatch(ids = []){
  const res = await fetch(`${BASE}/batch`, {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ ids })
  });
  if(!res.ok) return {};
  return res.json();
}
export async function setLabel(id, data = {}){
  const res = await fetch(BASE, {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ id, data })
  });
  if(!res.ok) throw new Error('Failed to save label');
  return res.json();
}
