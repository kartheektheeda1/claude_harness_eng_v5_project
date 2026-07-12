'use strict';

// Small guard against docs drift: the brownfield feature-routing behavior
// (FEATURE_LABEL -> /feature --auto) is easy to change in code and forget to
// update in the README. This just asserts the key terms stay documented.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const readmePath = path.join(__dirname, '..', 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');

test('README documents the FEATURE_LABEL brownfield change path', () => {
  assert.match(readme, /FEATURE_LABEL/);
  assert.match(readme, /agent-feature/);
});

test('README documents that /feature --auto runs with zero human gates', () => {
  assert.match(readme, /\/feature "<title>" --auto/);
});

test('README documents the mode-<command> per-issue override labels', () => {
  assert.match(readme, /mode-auto/);
  assert.match(readme, /mode-vibe/);
  assert.match(readme, /mode-improve/);
});
