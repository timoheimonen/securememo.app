// Basic route coverage test for all localized HTML pages.
// Uses Node's built-in test runner. We simulate the Worker fetch by importing the default export.
// We stub only minimal env (DB) and required globals (crypto.getRandomValues, caches).

import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.js';
import { getSupportedLocales } from '../src/lang/localization.js';

// Minimal fake D1 binding: HTML routes require env.DB to be truthy or worker returns 503.
const env = { DB: {} };

// Polyfill crypto.getRandomValues for nonce generation in tests
if (!globalThis.crypto) {
  globalThis.crypto = {};
}
if (!globalThis.crypto.getRandomValues) {
  globalThis.crypto.getRandomValues = (arr) => {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    return arr;
  };
}

// Simple in-memory cache polyfill implementing the subset used (match/put)
class SimpleCache {
  constructor() {
    this.store = new Map();
  }
  async match(request) {
    const key = typeof request === 'string' ? request : request.url;
    return this.store.get(key) || null;
  }
  async put(request, response) {
    const key = typeof request === 'string' ? request : request.url;
    // Clone the response by creating a new one with same body & headers (Node 18 Response supports bodyUsed once)
    const cloned = new Response(await response.clone().arrayBuffer(), {
      status: response.status,
      headers: response.headers,
    });
    this.store.set(key, cloned);
  }
}
if (!globalThis.caches) {
  globalThis.caches = { default: new SimpleCache() };
}

// Pages to test (path without locale prefix)
const pagePaths = [
  '/',
  '/about.html',
  '/create-memo.html',
  '/read-memo.html',
  '/tos.html',
  '/privacy.html',
];

const locales = getSupportedLocales();

// Minimal ctx with waitUntil stub used by worker for caching side-effects
const ctx = { waitUntil: (promise) => promise }; // no-op in tests

for (const locale of locales) {
  for (const page of pagePaths) {
    const localizedPath = page === '/' ? `/${locale}` : `/${locale}${page}`;
    test(`GET ${localizedPath} returns 200 HTML (${locale})`, async () => {
      const req = new Request(`https://securememo.app${localizedPath}`, { method: 'GET' });
      const res = await worker.fetch(req, env, ctx);
      assert.equal(res.status, 200, `Expected 200 for ${localizedPath}, got ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      assert.match(ct, /text\/html/i, 'Content-Type should be text/html');
      const body = await res.text();
      assert.ok(body.includes('<!DOCTYPE html'), 'Response should contain DOCTYPE');
    });
  }
}
