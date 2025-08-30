/*
 Lightweight lifecycle test (manual) for create -> read -> delete.
 Executed via `node tests/memo.lifecycle.test.mjs` in CI (no Vitest to keep dependencies minimal).
*/
import worker from '../src/index.js';

class InMemoryD1 {
  constructor(){ this.memos = new Map(); }
  prepare(sql){
    const db=this; return {
      _sql: sql, _b: [], bind(...v){ this._b=v; return this; },
      async first(){
        if (/SELECT 1 FROM memos/.test(this._sql)) { return db.memos.has(this._b[0]) ? 1 : null; }
        if (/SELECT encrypted_message, deletion_token_hash FROM memos/.test(this._sql)) {
          const r=db.memos.get(this._b[0]); if(!r) return null; return { encrypted_message:r.encrypted_message, deletion_token_hash:r.deletion_token_hash}; }
        if (/SELECT deletion_token_hash FROM memos/.test(this._sql)) { const r=db.memos.get(this._b[0]); return r? { deletion_token_hash:r.deletion_token_hash }:null; }
        return null;
      },
      async run(){
        if (/INSERT INTO memos/.test(this._sql)) { const [id,msg,exp,del]=this._b; if(db.memos.has(id)) throw new Error('UNIQUE'); db.memos.set(id,{encrypted_message:msg,expiry_time:exp,deletion_token_hash:del}); return {changes:1}; }
        if (/DELETE FROM memos WHERE memo_id/.test(this._sql)) { const ex=db.memos.delete(this._b[0]); return {changes: ex?1:0}; }
        return {changes:0};
      }
    };
  }
}

function randomToken(len){ const c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; let o=''; for(let i=0;i<len;i++) o+=c[i%c.length]; return o; }
async function sha256b64(str){ const h=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); return btoa(String.fromCharCode(...Array.from(new Uint8Array(h)))); }

// Mock fetch for Turnstile
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (String(url).includes('turnstile')) return new Response(JSON.stringify({ success: true }), { status:200, headers:{'Content-Type':'application/json'} });
  return realFetch(url, opts);
};

const env = { DB: new InMemoryD1(), TURNSTILE_SECRET:'x', TURNSTILE_SITE_KEY:'x' };
const deletionToken = randomToken(32);
const deletionTokenHash = await sha256b64(deletionToken);
const encryptedMessage = 'ENCRYPTED:test123';

function req(path, init){ return new Request('https://example.com'+path, init); }

async function main(){
  // create
  const create = await worker.fetch(req('/api/create-memo', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ encryptedMessage, expiryHours:24, cfTurnstileResponse:'toktoktoktoktok', deletionTokenHash }) }), env, { waitUntil:()=>{} });
  if (create.status !== 200) throw new Error('Create failed '+create.status);
  const cJ = await create.json();
  const memoId = cJ.memoId;

  // read
  const read = await worker.fetch(req(`/api/read-memo?id=${encodeURIComponent(memoId)}`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ cfTurnstileResponse:'toktoktoktoktok' }) }), env, { waitUntil:()=>{} });
  if (read.status !== 200) throw new Error('Read failed');
  const rJ = await read.json();
  if (rJ.encryptedMessage !== encryptedMessage) throw new Error('Encrypted mismatch');

  // delete
  const del = await worker.fetch(req('/api/confirm-delete', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ memoId, deletionToken }) }), env, { waitUntil:()=>{} });
  if (del.status !== 200) throw new Error('Delete failed');

  // read again -> expect 404
  const again = await worker.fetch(req(`/api/read-memo?id=${encodeURIComponent(memoId)}`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ cfTurnstileResponse:'toktoktoktoktok' }) }), env, { waitUntil:()=>{} });
  if (again.status !== 404) throw new Error('Expected 404 after deletion, got '+again.status);
}

await main();
