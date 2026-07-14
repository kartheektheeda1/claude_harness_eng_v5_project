'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, issueKind, isEligible, isStuck } = require('./eligibility');

const baseConfig = {
  tracker: {
    readyState: 'Ready for Agent',
    runningState: 'In Progress',
    readyLabel: 'agent-ready',
    planLabel: 'agent-plan',
    featureLabel: 'agent-feature',
    terminalStates: ['Done', 'Canceled']
  }
};

test('normalize trims whitespace and lowercases', () => {
  assert.equal(normalize('  Ready For Agent '), 'ready for agent');
  assert.equal(normalize(undefined), '');
});

test('issueKind resolves plan, feature, and execute labels', () => {
  assert.equal(issueKind({ labels: ['agent-plan'] }, baseConfig), 'plan');
  assert.equal(issueKind({ labels: ['agent-feature'] }, baseConfig), 'feature');
  assert.equal(issueKind({ labels: ['agent-ready'] }, baseConfig), 'execute');
  assert.equal(issueKind({ labels: ['unrelated'] }, baseConfig), null);
});

test('issueKind prefers plan over feature/execute when multiple labels are present', () => {
  assert.equal(issueKind({ labels: ['agent-plan', 'agent-ready'] }, baseConfig), 'plan');
});

test('issueKind returns null for feature when featureLabel is unset', () => {
  const cfg = { tracker: { ...baseConfig.tracker, featureLabel: '' } };
  assert.equal(issueKind({ labels: ['agent-feature'] }, cfg), null);
});

test('isEligible requires the ready state, a recognized label, and cleared blockers', () => {
  assert.equal(isEligible({ state: 'Ready for Agent', labels: ['agent-ready'], blockedBy: [{ state: 'Done' }] }, baseConfig), true);
  assert.equal(isEligible({ state: 'Ready for Agent', labels: ['agent-plan'], blockedBy: [] }, baseConfig), true);
  assert.equal(isEligible({ state: 'Ready for Agent', labels: ['agent-ready'], blockedBy: [{ state: 'In Progress' }] }, baseConfig), false);
  assert.equal(isEligible({ state: 'Ready for Agent', labels: ['nope'], blockedBy: [] }, baseConfig), false);
  assert.equal(isEligible({ state: 'Todo', labels: ['agent-ready'], blockedBy: [] }, baseConfig), false);
});

test('isStuck fires only when an issue is running but not claimed by this process', () => {
  assert.equal(isStuck({ id: 'i1', state: 'In Progress' }, new Set(), baseConfig), true);
  assert.equal(isStuck({ id: 'i1', state: 'In Progress' }, new Set(['i1']), baseConfig), false);
  assert.equal(isStuck({ id: 'i1', state: 'Ready for Agent' }, new Set(), baseConfig), false);
});
