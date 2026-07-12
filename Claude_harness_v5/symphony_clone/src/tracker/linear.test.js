'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeLinearIssue } = require('./linear');

function rawIssue(overrides = {}) {
  return {
    id: 'issue-1',
    identifier: 'ENG-101',
    title: 'Do the thing',
    description: 'body text',
    url: 'https://linear.app/x/issue/ENG-101',
    branchName: 'eng-101-do-the-thing',
    priority: 2,
    state: { name: 'Ready for Agent' },
    labels: { nodes: [{ name: 'agent-ready' }] },
    relations: { nodes: [] },
    ...overrides
  };
}

test('normalizeLinearIssue flattens label and state nodes', () => {
  const normalized = normalizeLinearIssue(rawIssue());
  assert.equal(normalized.key, 'ENG-101');
  assert.equal(normalized.state, 'Ready for Agent');
  assert.deepEqual(normalized.labels, ['agent-ready']);
});

test('normalizeLinearIssue keeps only blocked_by relations, not blocks', () => {
  const issue = rawIssue({
    relations: {
      nodes: [
        { type: 'blocked_by', relatedIssue: { id: 'b1', identifier: 'ENG-90', state: { name: 'Done' } } },
        { type: 'blocks', relatedIssue: { id: 'b2', identifier: 'ENG-110', state: { name: 'Todo' } } }
      ]
    }
  });
  const normalized = normalizeLinearIssue(issue);
  assert.equal(normalized.blockedBy.length, 1);
  assert.equal(normalized.blockedBy[0].key, 'ENG-90');
});

test('normalizeLinearIssue tolerates a missing description and state', () => {
  const issue = rawIssue({ description: null, state: null });
  const normalized = normalizeLinearIssue(issue);
  assert.equal(normalized.description, '');
  assert.equal(normalized.state, null);
});
