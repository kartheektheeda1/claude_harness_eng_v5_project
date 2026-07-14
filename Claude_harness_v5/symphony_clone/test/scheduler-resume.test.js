'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Scheduler } = require('../src/orchestrator/scheduler');
const { StateStore } = require('../src/orchestrator/state-store');

function baseConfig() {
  return {
    maxConcurrentRuns: 1,
    tracker: {
      readyState: 'Ready for Agent', runningState: 'In Progress',
      blockedState: 'Blocked', blockedStateCandidates: ['Blocked'],
      readyLabel: 'agent-ready', planLabel: 'agent-plan', featureLabel: 'agent-feature',
      terminalStates: ['Done']
    },
    retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 5000 },
    github: { branchPrefix: 'agent', baseBranch: 'main', createPr: false }
  };
}

function tempStateDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-resume-state-'));
}

test('recordWorkspace logs workspace_resumed and stores the recovery tag when a run resumes', async () => {
  const logs = [];
  const stateStore = new StateStore({ stateDir: tempStateDir() });
  const scheduler = new Scheduler({
    config: baseConfig(),
    tracker: {},
    workspaceManager: {},
    claudeRunner: {},
    stateStore,
    logger: { info: (event, data) => logs.push({ event, data }), warn: () => {}, error: () => {} }
  });
  const issue = { id: 'i1', key: 'ENG-1' };
  stateStore.startRun(issue, { attempt: 2, groupId: 'A' });

  scheduler.recordWorkspace(issue, {
    workspacePath: '/workspaces/ENG-1',
    branchName: 'agent/ENG-1',
    resumed: true,
    commitsAhead: 3,
    backupRef: 'recovery/agent/ENG-1/attempt-2-1700000000000-abcd1234'
  });

  assert.equal(logs.some((l) => l.event === 'workspace_resumed' && l.data.commitsAhead === 3), true);
  const run = stateStore.getRun(issue);
  assert.equal(run.recoveryTag, 'recovery/agent/ENG-1/attempt-2-1700000000000-abcd1234');
});

test('recordWorkspace does not log workspace_resumed or set recoveryTag for a fresh (non-resumed) workspace', async () => {
  const logs = [];
  const stateStore = new StateStore({ stateDir: tempStateDir() });
  const scheduler = new Scheduler({
    config: baseConfig(),
    tracker: {},
    workspaceManager: {},
    claudeRunner: {},
    stateStore,
    logger: { info: (event, data) => logs.push({ event, data }), warn: () => {}, error: () => {} }
  });
  const issue = { id: 'i2', key: 'ENG-2' };
  stateStore.startRun(issue, { attempt: 1, groupId: 'B' });

  scheduler.recordWorkspace(issue, { workspacePath: '/workspaces/ENG-2', branchName: 'agent/ENG-2', resumed: false });

  assert.equal(logs.some((l) => l.event === 'workspace_resumed'), false);
  assert.equal('recoveryTag' in stateStore.getRun(issue), false);
});

test('a second attempt after recordFailure carries the incremented attempt number into startRun', () => {
  const stateStore = new StateStore({ stateDir: tempStateDir() });
  const issue = { id: 'i3', key: 'ENG-3' };

  stateStore.startRun(issue, { attempt: 1 });
  stateStore.recordFailure(issue, new Error('push failed'), { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 5000, now: new Date() });

  const nextAttempt = stateStore.nextAttempt(issue);
  assert.equal(nextAttempt, 2);
});
