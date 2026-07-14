'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Scheduler } = require('./scheduler');

function baseConfig(overrides = {}) {
  return {
    maxConcurrentRuns: 1,
    tracker: {
      readyState: 'Ready for Agent', runningState: 'In Progress',
      blockedState: 'Blocked', blockedStateCandidates: ['Blocked'],
      readyLabel: 'agent-ready', planLabel: 'agent-plan', featureLabel: 'agent-feature',
      terminalStates: ['Done']
    },
    retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 5000 },
    github: { branchPrefix: 'agent', baseBranch: 'main', createPr: false },
    ...overrides
  };
}

function fakeTracker(issues) {
  const calls = { moves: [], comments: [] };
  return {
    calls,
    listCandidates: async () => issues,
    moveIssue: async (id, state) => calls.moves.push({ id, state }),
    addComment: async (id, body) => calls.comments.push({ id, body })
  };
}

function noopLogger() {
  return { info: () => {}, warn: () => {}, error: () => {} };
}

test('tick starts only as many issues as remaining capacity allows', async () => {
  const issues = [
    { id: 'i1', key: 'ENG-1', state: 'Ready for Agent', labels: ['agent-ready'], blockedBy: [], description: 'Group: A' },
    { id: 'i2', key: 'ENG-2', state: 'Ready for Agent', labels: ['agent-ready'], blockedBy: [], description: 'Group: B' }
  ];
  const tracker = fakeTracker(issues);
  const claudeRunner = { run: async () => new Promise(() => {}) }; // never resolves within the test
  const workspaceManager = { prepare: async () => new Promise(() => {}) };

  const scheduler = new Scheduler({
    config: baseConfig({ maxConcurrentRuns: 1 }),
    tracker,
    workspaceManager,
    claudeRunner,
    stateStore: null,
    logger: noopLogger()
  });

  const result = await scheduler.tick();
  assert.equal(result.eligible, 2);
  assert.equal(result.started, 1);
});

test('reclaimStuck resets an orphaned in-progress issue back to ready', async () => {
  const issue = { id: 'i1', key: 'ENG-1', state: 'In Progress', labels: [], blockedBy: [] };
  const tracker = fakeTracker([issue]);
  const scheduler = new Scheduler({
    config: baseConfig(),
    tracker,
    workspaceManager: {},
    claudeRunner: {},
    stateStore: { recordFailure: () => {}, dueForRetry: () => true },
    logger: noopLogger()
  });

  const reclaimed = await scheduler.reclaimStuck([issue]);
  assert.equal(reclaimed, 1);
  assert.equal(tracker.calls.moves[0].state, 'Ready for Agent');
});

test('dispatchIssue routes plan/feature/ready labels to the matching run method', () => {
  const scheduler = new Scheduler({ config: baseConfig(), tracker: {}, workspaceManager: {}, claudeRunner: {}, stateStore: null, logger: noopLogger() });

  let called = null;
  scheduler.runPlanningIssue = (issue) => { called = ['plan', issue.key]; };
  scheduler.runFeatureIssue = (issue) => { called = ['feature', issue.key]; };
  scheduler.runIssue = (issue) => { called = ['execute', issue.key]; };

  scheduler.dispatchIssue({ key: 'ENG-1', labels: ['agent-plan'] });
  assert.deepEqual(called, ['plan', 'ENG-1']);

  scheduler.dispatchIssue({ key: 'ENG-2', labels: ['agent-feature'] });
  assert.deepEqual(called, ['feature', 'ENG-2']);

  scheduler.dispatchIssue({ key: 'ENG-3', labels: ['agent-ready'] });
  assert.deepEqual(called, ['execute', 'ENG-3']);
});

test('claimAndRun moves the issue to blocked and comments when the run throws', async () => {
  const issue = { id: 'i1', key: 'ENG-4', labels: ['agent-ready'], blockedBy: [] };
  const tracker = fakeTracker([issue]);
  const scheduler = new Scheduler({
    config: baseConfig(),
    tracker,
    workspaceManager: { prepare: async () => { throw new Error('clone failed'); } },
    claudeRunner: { run: async () => {} },
    stateStore: null,
    logger: noopLogger()
  });

  await scheduler.claimAndRun(issue, {
    group: { id: 'A', stories: [] },
    startedEvent: 'run_started',
    claimedComment: 'claimed',
    buildPrompt: () => 'prompt',
    finish: async () => {}
  });

  assert.equal(tracker.calls.moves.some((m) => m.state === 'Blocked'), true);
  assert.equal(scheduler.running.size, 0);
});

test('claimAndRun is a no-op when the issue is already running', async () => {
  const issue = { id: 'i1', key: 'ENG-5' };
  const scheduler = new Scheduler({ config: baseConfig(), tracker: fakeTracker([]), workspaceManager: {}, claudeRunner: {}, stateStore: null, logger: noopLogger() });
  scheduler.running.add('i1');

  let ran = false;
  await scheduler.claimAndRun(issue, { group: { id: 'A' }, startedEvent: 'x', claimedComment: 'x', buildPrompt: () => { ran = true; return ''; }, finish: async () => {} });

  assert.equal(ran, false);
});
