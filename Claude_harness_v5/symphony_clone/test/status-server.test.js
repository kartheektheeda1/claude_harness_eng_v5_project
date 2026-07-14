'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { startStatusServer, renderDashboard } = require('../src/observability/status-server');

function get(port, urlPath) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: urlPath }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

test('GET /health returns {ok:true}', async () => {
  const stateStore = { snapshot: () => ({ runs: {} }) };
  const server = await startStatusServer({ port: 0, stateStore, logger: null });
  const { port } = server.address();

  const response = await get(port, '/health');
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), { ok: true });

  server.close();
});

test('GET /state returns the state store snapshot as JSON', async () => {
  const stateStore = { snapshot: () => ({ runs: { 'ENG-1': { status: 'running' } } }) };
  const server = await startStatusServer({ port: 0, stateStore, logger: null });
  const { port } = server.address();

  const response = await get(port, '/state');
  assert.deepEqual(JSON.parse(response.body), { runs: { 'ENG-1': { status: 'running' } } });

  server.close();
});

test('GET / renders an HTML dashboard table', async () => {
  const stateStore = { snapshot: () => ({ runs: { 'ENG-1': { issueKey: 'ENG-1', status: 'human_review', attempt: 1 } } }) };
  const server = await startStatusServer({ port: 0, stateStore, logger: null });
  const { port } = server.address();

  const response = await get(port, '/');
  assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');
  assert.match(response.body, /<table>/);
  assert.match(response.body, /ENG-1/);

  server.close();
});

test('an unknown route returns 404 JSON', async () => {
  const server = await startStatusServer({ port: 0, stateStore: { snapshot: () => ({ runs: {} }) }, logger: null });
  const { port } = server.address();

  const response = await get(port, '/nope');
  assert.equal(response.status, 404);

  server.close();
});

test('renderDashboard escapes HTML-significant characters in run fields', () => {
  const html = renderDashboard({ runs: { x: { issueKey: '<script>', status: 'ok', attempt: 1, lastError: 'a & b' } } });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /a &amp; b/);
});
