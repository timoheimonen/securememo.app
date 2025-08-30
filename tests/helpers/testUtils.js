/* eslint-env node */
/**
 * Shared lightweight test utilities to reduce duplication and complexity in test files.
 * Contains: InMemoryD1 (minimal SQL pattern emulation), randomToken, sha256b64, makeRequest,
 * and a helper to mock Cloudflare Turnstile verification fetch.
 */

/** Minimal in-memory D1 emulation for required SQL patterns */
export class InMemoryD1 {
  constructor() { this.memos = new Map(); }
  /**
   * Prepare a statement and classify SQL to reduce branching in handlers.
   * @param {string} sql
   * @returns {{bind: Function, first: Function, run: Function}}
   */
  prepare(sql) {
    const db = this;
    const norm = sql.replace(/\s+/g, ' ');
    const type = /INSERT INTO memos/.test(norm) ? 'insert'
      : /DELETE FROM memos WHERE memo_id/.test(norm) ? 'delete'
      : /SELECT 1 FROM memos/.test(norm) ? 'exists'
      : /SELECT .*encrypted_message.*deletion_token_hash.* FROM .*memos/.test(norm) ? 'readFull'
      : /SELECT deletion_token_hash FROM memos/.test(norm) ? 'readDelHash'
      : 'unknown';
    return {
      _bindings: [],
      bind(...vals) { this._bindings = vals; return this; },
      async first() {
        const [id] = this._bindings;
        switch (type) {
          case 'exists': return db.memos.has(id) ? 1 : null;
          case 'readFull': { const r = db.memos.get(id); return r ? { encrypted_message: r.encrypted_message, deletion_token_hash: r.deletion_token_hash } : null; }
          case 'readDelHash': { const r = db.memos.get(id); return r ? { deletion_token_hash: r.deletion_token_hash } : null; }
          default: return null;
        }
      },
      async run() {
        switch (type) {
          case 'insert': {
            const [id, msg, exp, del] = this._bindings; // eslint-disable-line no-unused-vars
            if (db.memos.has(id)) throw new Error('UNIQUE constraint failed: memos.memo_id');
            db.memos.set(id, { encrypted_message: msg, expiry_time: exp, deletion_token_hash: del });
            return { changes: 1 };
          }
          case 'delete': {
            const [id] = this._bindings;
            const existed = db.memos.delete(id);
            return { changes: existed ? 1 : 0 };
          }
          default: return { changes: 0 };
        }
      }
    };
  }
}

/**
 * Deterministic pseudo-random token (simple for test purposes only).
 * @param {number} len
 * @returns {string}
 */
export function randomToken(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[i % chars.length];
  return out;
}

/**
 * Compute SHA-256 returning a base64 digest (browser crypto + Buffer polyfill in Node).
 * @param {string} str
 * @returns {Promise<string>}
 */
export async function sha256b64(str) {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', new globalThis.TextEncoder().encode(str));
  return globalThis.Buffer.from(new Uint8Array(hash)).toString('base64');
}

/**
 * Build a Request relative to example.com for worker fetch calls.
 * @param {string} path
 * @param {RequestInit} init
 */
export function makeRequest(path, init) {
  return new globalThis.Request('https://example.com' + path, init);
}

/**
 * Mock Turnstile verification fetch to always succeed. Returns a restore function.
 * @returns {() => void}
 */
export function mockTurnstileFetch() {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('turnstile')) {
      return new globalThis.Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return realFetch(url, opts);
  };
  return () => { globalThis.fetch = realFetch; };
}
