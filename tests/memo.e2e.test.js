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
import { InMemoryD1, randomToken, sha256b64, makeRequest, mockTurnstileFetch } from './helpers/testUtils.js';

let env; // shared env per test file
let worker; // worker module

beforeAll(async () => {
  mockTurnstileFetch();
  const mod = await import('../src/index.js');
  worker = mod.default || mod;
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
