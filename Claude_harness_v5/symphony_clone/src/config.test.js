'use strict';

// Focused coverage for the auto-merge / planning / feature sections of config.
// The wider surface (retry, tracker states, provider validation) lives in
// test/config.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('./config');

function minimalEnv(overrides = {}) {
  return {
    TARGET_REPO_URL: 'git@github.com:o/r.git',
    LINEAR_API_KEY: 'k',
    LINEAR_PROJECT_SLUG: 's',
    ...overrides
  };
}

test('autoMerge is off by default, using merge/Done', () => {
  const config = loadConfig(minimalEnv(), { loadDotEnv: false });
  assert.equal(config.autoMerge.enabled, false);
  assert.equal(config.autoMerge.method, 'merge');
  assert.equal(config.autoMerge.doneState, 'Done');
});

test('AUTO_MERGE / MERGE_METHOD / DONE_STATE override the defaults', () => {
  const config = loadConfig(
    minimalEnv({ AUTO_MERGE: 'true', MERGE_METHOD: 'squash', DONE_STATE: 'Shipped' }),
    { loadDotEnv: false }
  );
  assert.equal(config.autoMerge.enabled, true);
  assert.equal(config.autoMerge.method, 'squash');
  assert.equal(config.autoMerge.doneState, 'Shipped');
});

test('an unrecognized MERGE_METHOD throws', () => {
  assert.throws(
    () => loadConfig(minimalEnv({ MERGE_METHOD: 'rocket' }), { loadDotEnv: false }),
    /MERGE_METHOD/
  );
});

test('planning section defaults PLAN_LABEL/PLANNED_STATE and honours overrides', () => {
  const defaults = loadConfig(minimalEnv(), { loadDotEnv: false });
  assert.equal(defaults.tracker.planLabel, 'agent-plan');
  assert.equal(defaults.tracker.plannedState, 'Planned');

  const overridden = loadConfig(
    minimalEnv({ PLAN_LABEL: 'prd-ready', PLANNED_STATE: 'Groomed' }),
    { loadDotEnv: false }
  );
  assert.equal(overridden.tracker.planLabel, 'prd-ready');
  assert.equal(overridden.tracker.plannedState, 'Groomed');
});

test('featureLabel defaults to agent-feature and honours FEATURE_LABEL', () => {
  const defaults = loadConfig(minimalEnv(), { loadDotEnv: false });
  assert.equal(defaults.tracker.featureLabel, 'agent-feature');

  const overridden = loadConfig(minimalEnv({ FEATURE_LABEL: 'agent-brownfield' }), { loadDotEnv: false });
  assert.equal(overridden.tracker.featureLabel, 'agent-brownfield');
});
