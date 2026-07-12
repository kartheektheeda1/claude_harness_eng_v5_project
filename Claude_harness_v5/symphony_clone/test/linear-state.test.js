'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { LinearTracker } = require('../src/tracker/linear');

function fetchReturning(workflowStates) {
  return async () => ({
    ok: true,
    text: async () => '',
    json: async () => ({ data: { workflowStates: { nodes: workflowStates } } })
  });
}

const config = { linear: { apiKey: 'k', apiUrl: 'https://linear.test/graphql', projectSlug: 's' }, tracker: {} };

test('findStateId matches the primary state name case-insensitively', async () => {
  const tracker = new LinearTracker(config, fetchReturning([{ id: 's1', name: 'Human Review' }, { id: 's2', name: 'Blocked' }]));
  const id = await tracker.findStateId('human review');
  assert.equal(id, 's1');
});

test('findStateId falls through a fallback-candidates list when the primary name is absent', async () => {
  const tracker = new LinearTracker(config, fetchReturning([{ id: 's1', name: 'In Review' }]));
  const id = await tracker.findStateId('Human Review', ['In Review', 'Review']);
  assert.equal(id, 's1');
});

test('findStateId throws a descriptive error listing available states when nothing matches', async () => {
  const tracker = new LinearTracker(config, fetchReturning([{ id: 's1', name: 'Todo' }, { id: 's2', name: 'Done' }]));
  await assert.rejects(
    tracker.findStateId('Blocked', ['Canceled']),
    /Linear workflow state not found: Blocked \(tried: Blocked, Canceled; available: Done, Todo\)/
  );
});

test('findStateId dedupes the primary name against the fallback list', async () => {
  let requestCount = 0;
  const fetchImpl = async () => {
    requestCount++;
    return { ok: true, text: async () => '', json: async () => ({ data: { workflowStates: { nodes: [{ id: 's1', name: 'Blocked' }] } } }) };
  };
  const tracker = new LinearTracker(config, fetchImpl);
  const id = await tracker.findStateId('Blocked', ['Blocked', 'Canceled']);
  assert.equal(id, 's1');
  assert.equal(requestCount, 1); // one call to list workflow states, regardless of duplicate candidates
});

test('graphql throws when the response carries GraphQL-level errors', async () => {
  const fetchImpl = async () => ({ ok: true, text: async () => '', json: async () => ({ errors: [{ message: 'not authorized' }] }) });
  const tracker = new LinearTracker(config, fetchImpl);
  await assert.rejects(tracker.listWorkflowStates(), /Linear GraphQL error: not authorized/);
});
