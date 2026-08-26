'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { commands } = require('../scripts/evaluate-contract');
const root = path.resolve(__dirname, '..', '..');

test('evaluator separates static, full, and browser verification modes', () => {
  const staticChecks = commands('static').map((item) => item.name);
  const fullChecks = commands('all').map((item) => item.name);
  const browserChecks = commands('browser').map((item) => item.name);
  assert.deepEqual(staticChecks, ['Harness structure', 'Specification contract', 'Harness contract tests']);
  assert.ok(fullChecks.includes('Backend verify'));
  assert.ok(fullChecks.includes('Symphony tests'));
  assert.ok(!fullChecks.includes('Browser acceptance tests'));
  assert.ok(browserChecks.includes('Browser acceptance tests'));
});

test('Windows command wrappers are executed through the system shell', () => {
  const source = fs.readFileSync(path.join(root, '.claude', 'scripts', 'evaluate-contract.js'), 'utf8');
  assert.match(source, /shell:\s*IS_WINDOWS/);
});
