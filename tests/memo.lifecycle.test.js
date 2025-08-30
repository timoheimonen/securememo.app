/* eslint-env node */
/*
 * Lifecycle test for create -> read -> delete (manual assertions) without external test runner.
 * Exits with non-zero code on failure so CI detects errors. -
 */
import worker from '../src/index.js';
import { InMemoryD1, randomToken, sha256b64, makeRequest, mockTurnstileFetch } from './helpers/testUtils.js';
// Vitest functions are imported conditionally only when running under the Vitest runner

// Polyfill btoa if missing (Node < 16 browsers)
if (typeof globalThis.btoa !== 'function') {
  globalThis.btoa = (str) => globalThis.Buffer.from(str, 'binary').toString('base64');
}

export async function lifecycleRun() {
  const env = { DB: new InMemoryD1(), TURNSTILE_SECRET: 'x', TURNSTILE_SITE_KEY: 'x' };
  const deletionToken = randomToken(32);
  const deletionTokenHash = await sha256b64(deletionToken);
  const encryptedMessage = 'ENCRYPTED:test123';

  // Mock fetch for Turnstile verification
  const restoreFetch = mockTurnstileFetch();

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

  // Restore fetch to avoid side effects when run under Vitest
  restoreFetch();
}

// If executed directly (node) run lifecycle once and exit; under Vitest we expose a proper suite.
const _proc = typeof globalThis.process !== 'undefined' ? globalThis.process : undefined;
if (_proc && !_proc.env.VITEST) {
  lifecycleRun()
    .then(() => { if (_proc && _proc.exit) _proc.exit(0); })
    .catch(err => { if (globalThis.console && globalThis.console.error) globalThis.console.error(err); if (_proc && _proc.exit) _proc.exit(1); });
} else if (typeof _proc !== 'undefined' && _proc.env.VITEST) {
  // Top-level await is supported (ESM). Import vitest only inside the runner environment.
  const { describe, it } = await import('vitest');
  describe('manual lifecycle (legacy script)', () => {
    it('runs create->read->delete flow', async () => {
      await lifecycleRun();
    });
  });
}
