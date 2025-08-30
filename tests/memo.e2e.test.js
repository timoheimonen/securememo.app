/* eslint-env node, worker */
/*
 End-to-end integration test for memo lifecycle (create -> read -> delete) using Cloudflare D1 local bindings.
 Uses Vitest + Miniflare (bundled inside Wrangler) via the unstable dev worker runtime.

 Strategy:
 1. Spin up the worker using the exported module (no network) with a mocked env and fetch helper.
 2. Provide an in-memory D1 database via Miniflare's D1 implementation (Wrangler provides @cloudflare/workers-types but we avoid external deps).
 3. Mock Turnstile verification fetch call to always return success during tests.
 4. Perform create-memo POST, capture memoId.
 5. Read memo via POST /api/read-memo?id=... (should return encryptedMessage).
 6. Delete memo via POST /api/confirm-delete with memoId + deletionToken (original so hash matches stored hash).
 7. Attempt second read which should now return access denied (404 generic error).

 NOTE: This is a lightweight test; it does not run real crypto, only validates server contract.
*/
import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Minimal in-memory D1 emulation for the subset of SQL patterns exercised by the tests.
 * This avoids adding external dependencies while giving deterministic behavior.
 */
class InMemoryD1 {
  constructor() { this.memos = new Map(); }
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
  if (/SELECT encrypted_message, deletion_token_hash FROM memos/.test(this._sql.replace(/\s+/g,' '))) {
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
          if (db.memos.has(id)) throw new Error('UNIQUE constraint failed: memos.memo_id');
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

/**
 * Generate a deterministic pseudo-random token (simple for test purposes only).
 * @param {number} len length
 * @returns {string}
 */
function randomToken(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[i % chars.length];
  return out;
}

/**
 * Compute SHA-256 and return base64 encoding.
 * @param {string} str input
 * @returns {Promise<string>} base64 hash
 */
async function sha256b64(str) {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', new globalThis.TextEncoder().encode(str));
  return globalThis.Buffer.from(new Uint8Array(hash)).toString('base64');
}

function makeRequest(path, init) {
  return new globalThis.Request('https://example.com' + path, init);
}

let env; // shared env per test file
let worker; // worker module

beforeAll(async () => {
  // Mock Turnstile verification fetch BEFORE importing worker so handler uses mocked fetch
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('turnstile')) {
      return new globalThis.Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return realFetch(url, opts);
  };
  // Dynamically import worker after mocks (single import)
  const mod = await import('../src/index.js');
  worker = mod.default || mod; // Worker export style compatibility
});

describe('memo lifecycle e2e', () => {
  it('creates, reads, deletes, then denies second read', async () => {
    env = { DB: new InMemoryD1(), TURNSTILE_SECRET: 'x', TURNSTILE_SITE_KEY: 'x' };
    const deletionToken = randomToken(32);
    const deletionTokenHash = await sha256b64(deletionToken);
    const encryptedMessage = 'ENCRYPTED:test123';

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
    expect(createResp.status).toBe(200);
    const createJson = await createResp.json();
    expect(createJson.success).toBe(true);
    const memoId = createJson.memoId;
    expect(memoId).toBeTruthy();

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
    expect(readResp.status).toBe(200);
    const readJson = await readResp.json();
    expect(readJson.encryptedMessage).toBe(encryptedMessage);

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
    expect(deleteResp.status).toBe(200);
    const deleteJson = await deleteResp.json();
    expect(deleteJson.success).toBe(true);

    // Second read should return 404 (generic denial)
    const readAgain = await worker.fetch(
      makeRequest(`/api/read-memo?id=${encodeURIComponent(memoId)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cfTurnstileResponse: 'turnstiletoken12345' })
      }),
      env,
      { waitUntil: () => {} }
    );
    expect(readAgain.status).toBe(404);
  });
});
