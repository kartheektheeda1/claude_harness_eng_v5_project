'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');

test('project plugin is distinct from and locked to the V5 foundation', () => {
  const projectPlugin = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'harness-lock.json'), 'utf8'));
  assert.equal(projectPlugin.name, 'claimflow-claims-operations');
  assert.equal(lock.commit, '40b4ae9ac47c398d28e5aeb5e7151ee56739de35');
  assert.equal(lock.snapshotDate, '2026-07-10');
});
