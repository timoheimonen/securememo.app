/* eslint-env node */
/*
 * Lifecycle test for create -> read -> delete (manual assertions) without external test runner.
 * Exits with non-zero code on failure so CI detects errors.
 */
import worker from '../src/index.js';
// When running under Vitest register tests synchronously so collection finds them
import { describe, it } from 'vitest';

// Polyfills for Node execution environment (outside Vitest runner)
if (typeof globalThis.btoa !== 'function') {
  /**
   * Base64 encode a binary string (Node.js polyfill for browser btoa)
   * @param {string} str
   * @returns {string}
   */
  globalThis.btoa = (str) => globalThis.Buffer.from(str, 'binary').toString('base64');
}

/** Minimal in-memory D1 emulation for required SQL patterns */
class InMemoryD1 {
  constructor() {
    this.memos = new Map();
  }

  prepare(sql) {
    const db = this;
    return {
      _sql: sql,
      _bindings: [],
      bind(...vals) { this._bindings = vals; return this; },
      async first() {
        if (/SELECT 1 FROM memos/.test(this._sql)) {
          return db.memos.has(this._bindings[0]) ? 1 : null;
        }
  if (/SELECT[\s\S]*encrypted_message[\s\S]*deletion_token_hash[\s\S]*FROM[\s\S]*memos/.test(this._sql)) {
          const rec = db.memos.get(this._bindings[0]);
          return rec ? { encrypted_message: rec.encrypted_message, deletion_token_hash: rec.deletion_token_hash } : null;
        }
        if (/SELECT deletion_token_hash FROM memos/.test(this._sql)) {
          const rec = db.memos.get(this._bindings[0]);
          return rec ? { deletion_token_hash: rec.deletion_token_hash } : null;
        }
        return null;
      },
      async run() {
        if (/INSERT INTO memos/.test(this._sql)) {
          const [id, msg, exp, del] = this._bindings;
          if (db.memos.has(id)) throw new Error('UNIQUE');
          db.memos.set(id, { encrypted_message: msg, expiry_time: exp, deletion_token_hash: del });
          return { changes: 1 };
        }
        if (/DELETE FROM memos WHERE memo_id/.test(this._sql)) {
          const existed = db.memos.delete(this._bindings[0]);
          return { changes: existed ? 1 : 0 };
        }
        return { changes: 0 };
      }
    };
  }
}

function randomToken(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[i % chars.length];
  return out;
}

async function sha256b64(str) {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', new globalThis.TextEncoder().encode(str));
  const arr = Array.from(new Uint8Array(hash));
  return globalThis.btoa(String.fromCharCode(...arr));
}

function makeRequest(path, init) {
  return new globalThis.Request('https://example.com' + path, init);
}

export async function lifecycleRun() {
  const env = { DB: new InMemoryD1(), TURNSTILE_SECRET: 'x', TURNSTILE_SITE_KEY: 'x' };
  const deletionToken = randomToken(32);
  const deletionTokenHash = await sha256b64(deletionToken);
  const encryptedMessage = 'ENCRYPTED:test123';

  // Mock fetch for Turnstile verification
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('turnstile')) {
      return new globalThis.Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return realFetch(url, opts);
  };

  // Create memo
  const createResp = await worker.fetch(
    makeRequest('/api/create-memo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ encryptedMessage, expiryHours: 24, cfTurnstileResponse: 'turnstiletoken12345', deletionTokenHash })
    }),
    env,
    { waitUntil: () => {} }
  );
  if (createResp.status !== 200) throw new Error('Create failed');
  const createJson = await createResp.json();
  const memoId = createJson.memoId;
  if (!memoId) throw new Error('Missing memoId');

  // Read memo
  const readResp = await worker.fetch(
    makeRequest(`/api/read-memo?id=${encodeURIComponent(memoId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cfTurnstileResponse: 'turnstiletoken12345' })
    }),
    env,
    { waitUntil: () => {} }
  );
  if (readResp.status !== 200) throw new Error('Read failed');
  const readJson = await readResp.json();
  if (readJson.encryptedMessage !== encryptedMessage) throw new Error('Encrypted message mismatch');

  // Delete memo
  const deleteResp = await worker.fetch(
    makeRequest('/api/confirm-delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ memoId, deletionToken })
    }),
    env,
    { waitUntil: () => {} }
  );
  if (deleteResp.status !== 200) throw new Error('Delete failed');

  // Read again should be 404
  const readAgainResp = await worker.fetch(
    makeRequest(`/api/read-memo?id=${encodeURIComponent(memoId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cfTurnstileResponse: 'turnstiletoken12345' })
    }),
    env,
    { waitUntil: () => {} }
  );
  if (readAgainResp.status !== 404) throw new Error('Expected 404 after deletion');
}

// If executed directly (node) run lifecycle once and exit; under Vitest we expose a proper suite.
const _proc = typeof globalThis.process !== 'undefined' ? globalThis.process : undefined;
if (_proc && !_proc.env.VITEST) {
  lifecycleRun()
    .then(() => { if (_proc && _proc.exit) _proc.exit(0); })
    .catch(err => { if (globalThis.console && globalThis.console.error) globalThis.console.error(err); if (_proc && _proc.exit) _proc.exit(1); });
} else if (typeof describe === 'function' && typeof it === 'function') {
  describe('manual lifecycle (legacy script)', () => {
    it('runs create->read->delete flow', async () => {
      await lifecycleRun();
    });
  });
}
