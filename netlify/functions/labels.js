
// netlify/functions/labels.js — Netlify Function using @netlify/blobs
const { getStore } = require('@netlify/blobs');

function ok(body, status = 200){
  return {
    statusCode: status,
    headers: {
      'Content-Type':'application/json',
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Headers':'Content-Type',
      'Access-Control-Allow-Methods':'GET,POST,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}
function err(message, status=400){ return ok({ error: message }, status); }

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return ok({ ok: true });
  try{
    const store = getStore('labels');
    const path = event.path || '';
    if (event.httpMethod === 'GET'){
      const id = (event.queryStringParameters && event.queryStringParameters.id) || '';
      if(!id) return err('missing id');
      const raw = await store.get(id);
      return ok(raw ? JSON.parse(raw) : {});
    }
    if (event.httpMethod === 'POST'){
      if (path.endsWith('/batch')){
        const { ids } = JSON.parse(event.body || '{}');
        if(!Array.isArray(ids)) return err('ids must be an array');
        const result = {};
        await Promise.all(ids.map(async (id) => {
          const raw = await store.get(String(id));
          result[id] = raw ? JSON.parse(raw) : {};
        }));
        return ok(result);
      }
      const { id, data } = JSON.parse(event.body || '{}');
      if(!id || typeof data !== 'object') return err('missing id or data');
      const key = String(id);
      const currentRaw = await store.get(key);
      const current = currentRaw ? JSON.parse(currentRaw) : {};
      const next = { ...current, ...data };
      await store.set(key, JSON.stringify(next), { metadata: { updatedAt: new Date().toISOString() }});
      return ok({ ok:true, id, data: next });
    }
    return err('method not allowed', 405);
  }catch(e){
    return err(e.message || 'internal error', 500);
  }
};
