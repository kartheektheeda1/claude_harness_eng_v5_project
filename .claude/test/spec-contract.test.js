'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { validateSpecs } = require('../scripts/validate-specs');

const root = path.resolve(__dirname, '..', '..');

test('official specification contract is complete and traceable', () => {
  const result = validateSpecs(root);
  assert.deepEqual(result.errors, [], result.errors.join('\n'));
  assert.equal(result.counts.acceptanceCriteria, 10);
  assert.equal(result.counts.matrixRows, 10);
  assert.ok(result.counts.contracts >= 3);
});
