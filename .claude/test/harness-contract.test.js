'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { validateHarness } = require('../scripts/validate-harness');

const root = path.resolve(__dirname, '..', '..');

test('locked V5 foundation and ClaimFlow substrate satisfy the harness contract', () => {
  const result = validateHarness(root);
  assert.deepEqual(result.errors, [], result.errors.join('\n'));
  assert.ok(result.counts.agents >= 10);
  assert.ok(result.counts.skills >= 7);
  assert.ok(result.counts.commands >= 3);
});
