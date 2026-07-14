'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { restRequest, basicAuth, truncate, normalize, unique } = require('./http');

function fakeFetch({ ok = true, status = 200, json = {}, text = '' } = {}) {
  return async () => ({
    ok,
    status,
    json: async () => json,
    text: async () => text
  });
}

test('restRequest resolves with the parsed JSON body on success', async () => {
  const result = await restRequest(fakeFetch({ json: { hello: 'world' } }), 'https://example.test', { method: 'GET' });
  assert.deepEqual(result, { hello: 'world' });
});

test('restRequest returns {} for a 204 response without reading a body', async () => {
  const result = await restRequest(fakeFetch({ status: 204 }), 'https://example.test', { method: 'DELETE' });
  assert.deepEqual(result, {});
});

test('restRequest throws with the error label and truncated body on failure', async () => {
  await assert.rejects(
    restRequest(fakeFetch({ ok: false, status: 500, text: 'boom' }), 'https://example.test', { method: 'GET', errorLabel: 'Widget fetch' }),
    /Widget fetch failed with HTTP 500: boom/
  );
});

test('restRequest sends a JSON body and sets Content-Type when body is provided', async () => {
  let capturedInit = null;
  const fetchImpl = async (_url, init) => {
    capturedInit = init;
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  await restRequest(fetchImpl, 'https://example.test', { method: 'POST', body: { a: 1 } });
  assert.equal(capturedInit.headers['Content-Type'], 'application/json');
  assert.equal(capturedInit.body, JSON.stringify({ a: 1 }));
});

test('basicAuth base64-encodes user:token', () => {
  assert.equal(basicAuth('me', 'secret'), Buffer.from('me:secret').toString('base64'));
});

test('truncate leaves short text untouched and ellipsizes long text', () => {
  assert.equal(truncate('short'), 'short');
  const long = 'x'.repeat(600);
  assert.equal(truncate(long).endsWith('…'), true);
  assert.equal(truncate(long).length, 501);
});

test('normalize trims and lowercases, tolerating null', () => {
  assert.equal(normalize('  Foo Bar '), 'foo bar');
  assert.equal(normalize(null), '');
});

test('unique dedupes while keeping falsy-but-meaningful values', () => {
  assert.deepEqual(unique([1, 1, 0, '', null, undefined, 2]), [1, 0, '', 2]);
});
