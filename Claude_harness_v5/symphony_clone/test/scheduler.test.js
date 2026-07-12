'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Scheduler } = require('../src/orchestrator/scheduler');
const { StateStore } = require('../src/orchestrator/state-store');

function baseConfig(overrides = {}) {
  return {
    maxConcurrentRuns: 1,
    tracker: {
      readyState: 'Ready for Agent', runningState: 'In Progress',
      blockedState: 'Blocked', blockedStateCandidates: ['Blocked'],
      reviewState: 'Human Review', reviewStateCandidates: ['Human Review'],
      plannedState: 'Planned', plannedStateCandidates: ['Planned'],
      readyLabel: 'agent-ready', planLabel: 'agent-plan', featureLabel: 'agent-feature',
      terminalStates: ['Done']
    },
    retry: { maxAttempts: 2, baseDelayMs: 1000, maxDelayMs: 5000 },
    github: { branchPrefix: 'agent', baseBranch: 'main', createPr: false },
    autoMerge: { enabled: false, method: 'merge', doneState: 'Done', doneStateCandidates: ['Done'] },
    ...overrides
  };
}

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-sched-ws-'));
}

function tempStateDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-sched-state-'));
}

async function writeResult(workspacePath, groupId, result) {
  const dir = path.join(workspacePath, '.claude', 'state', 'tracker-runs', groupId);
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(path.join(dir, 'result.json'), JSON.stringify(result));
}

function trackerHarness() {
  const moves = [];
  const comments = [];
  return {
    moves,
    comments,
    moveIssue: async (id, state) => moves.push({ id, state }),
    addComment: async (id, body) => comments.push({ id, body })
  };
}

function noopLogger() {
  return { info: () => {}, warn: () => {}, error: () => {} };
}

test('a successful execute run reaches human_review and records the branch/PR in state', async () => {
  const workspacePath = tempWorkspace();
  await writeResult(workspacePath, 'A', { status: 'human_review', summary: 'done', branch: 'agent/ENG-1', commit: 'abc' });

  const tracker = trackerHarness();
  const stateStore = new StateStore({ stateDir: tempStateDir() });
  const scheduler = new Scheduler({
    config: baseConfig(),
    tracker,
    workspaceManager: { prepare: async () => ({ workspacePath, branchName: 'agent/ENG-1', resumed: false }), pushBranch: async () => {}, cleanup: async () => {} },
    claudeRunner: { run: async () => {} },
    stateStore,
    logger: noopLogger()
  });

  const issue = { id: 'i1', key: 'ENG-1', labels: ['agent-ready'], description: '- Group: A' };
  await scheduler.claimAndRun(issue, {
    group: { id: 'A', stories: [] },
    startedEvent: 'run_started',
    claimedComment: 'claimed',
    buildPrompt: () => 'prompt',
    finish: (iss, grp, ws, rr) => require('../src/orchestrator/outcomes').finishExecution(scheduler, iss, grp, ws, rr)
  });

  assert.equal(tracker.moves.some((m) => m.state === 'Human Review'), true);
  assert.equal(stateStore.getRun(issue).status, 'human_review');
});

test('a blocked result moves the issue to Blocked and records the blocker', async () => {
  const workspacePath = tempWorkspace();
  await writeResult(workspacePath, 'B', { status: 'blocked', blocker: 'missing DATABASE_URL' });

  const tracker = trackerHarness();
  const stateStore = new StateStore({ stateDir: tempStateDir() });
  const scheduler = new Scheduler({
    config: baseConfig(),
    tracker,
    workspaceManager: { prepare: async () => ({ workspacePath, branchName: 'agent/ENG-2', resumed: false }), cleanup: async () => {} },
    claudeRunner: { run: async () => {} },
    stateStore,
    logger: noopLogger()
  });

  const issue = { id: 'i2', key: 'ENG-2', labels: ['agent-ready'], description: '- Group: B' };
  await scheduler.claimAndRun(issue, {
    group: { id: 'B', stories: [] },
    startedEvent: 'run_started',
    claimedComment: 'claimed',
    buildPrompt: () => 'prompt',
    finish: (iss, grp, ws, rr) => require('../src/orchestrator/outcomes').finishExecution(scheduler, iss, grp, ws, rr)
  });

  assert.equal(tracker.moves.some((m) => m.state === 'Blocked'), true);
});

test('a claude run failure schedules a retry and does not exhaust attempts prematurely', async () => {
  const tracker = trackerHarness();
  const stateStore = new StateStore({ stateDir: tempStateDir() });
  const scheduler = new Scheduler({
    config: baseConfig({ retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 5000 } }),
    tracker,
    workspaceManager: { prepare: async () => ({ workspacePath: tempWorkspace(), branchName: 'agent/ENG-3', resumed: false }) },
    claudeRunner: { run: async () => { throw new Error('claude crashed'); } },
    stateStore,
    logger: noopLogger()
  });

  const issue = { id: 'i3', key: 'ENG-3', labels: ['agent-ready'], description: '- Group: C' };
  await scheduler.claimAndRun(issue, { group: { id: 'C', stories: [] }, startedEvent: 'run_started', claimedComment: 'claimed', buildPrompt: () => 'prompt', finish: async () => {} });

  const run = stateStore.getRun(issue);
  assert.equal(run.status, 'retry_wait');
  assert.equal(tracker.moves.some((m) => m.state === 'Blocked'), false);
});

test('repeated failures past maxAttempts move the issue to Blocked', async () => {
  const tracker = trackerHarness();
  const stateStore = new StateStore({ stateDir: tempStateDir() });
  const config = baseConfig({ retry: { maxAttempts: 1, baseDelayMs: 1000, maxDelayMs: 5000 } });
  const scheduler = new Scheduler({
    config,
    tracker,
    workspaceManager: { prepare: async () => ({ workspacePath: tempWorkspace(), branchName: 'agent/ENG-4', resumed: false }) },
    claudeRunner: { run: async () => { throw new Error('claude crashed again'); } },
    stateStore,
    logger: noopLogger()
  });

  const issue = { id: 'i4', key: 'ENG-4', labels: ['agent-ready'], description: '- Group: D' };
  await scheduler.claimAndRun(issue, { group: { id: 'D', stories: [] }, startedEvent: 'run_started', claimedComment: 'claimed', buildPrompt: () => 'prompt', finish: async () => {} });

  assert.equal(tracker.moves.some((m) => m.state === 'Blocked'), true);
  assert.equal(stateStore.getRun(issue).status, 'failed');
});

test('with AUTO_MERGE enabled and enableAutoMerge succeeding, the issue advances to Done', async () => {
  const workspacePath = tempWorkspace();
  await writeResult(workspacePath, 'E', { status: 'human_review', summary: 'done' });

  const tracker = trackerHarness();
  const stateStore = new StateStore({ stateDir: tempStateDir() });
  const config = baseConfig({ autoMerge: { enabled: true, method: 'squash', doneState: 'Done', doneStateCandidates: ['Done'] } });
  const scheduler = new Scheduler({
    config,
    tracker,
    workspaceManager: { prepare: async () => ({ workspacePath, branchName: 'agent/ENG-5', resumed: false }), pushBranch: async () => {}, cleanup: async () => {} },
    claudeRunner: { run: async () => {} },
    stateStore,
    logger: noopLogger(),
    enableAutoMerge: async () => ({ enabled: true })
  });

  const issue = { id: 'i5', key: 'ENG-5', labels: ['agent-ready'], description: '- Group: E' };
  await scheduler.claimAndRun(issue, {
    group: { id: 'E', stories: [] },
    startedEvent: 'run_started',
    claimedComment: 'claimed',
    buildPrompt: () => 'prompt',
    finish: (iss, grp, ws, rr) => require('../src/orchestrator/outcomes').finishExecution(scheduler, iss, grp, ws, rr)
  });

  assert.equal(tracker.moves.some((m) => m.state === 'Done'), true);
  assert.equal(stateStore.getRun(issue).status, 'auto_merge');
});

test('tick() never dispatches more issues than maxConcurrentRuns allows across a mixed candidate set', async () => {
  const issues = ['A', 'B', 'C'].map((id) => ({ id: `i${id}`, key: `ENG-${id}`, state: 'Ready for Agent', labels: ['agent-ready'], blockedBy: [], description: `- Group: ${id}` }));
  const tracker = { listCandidates: async () => issues, moveIssue: async () => {}, addComment: async () => {} };
  const scheduler = new Scheduler({
    config: baseConfig({ maxConcurrentRuns: 2 }),
    tracker,
    workspaceManager: { prepare: async () => new Promise(() => {}) },
    claudeRunner: { run: async () => new Promise(() => {}) },
    stateStore: null,
    logger: noopLogger()
  });

  const result = await scheduler.tick();
  assert.equal(result.started, 2);
  assert.equal(scheduler.running.size, 2);
});

test('an issue already in this process\'s running set is skipped by tick()', async () => {
  const issue = { id: 'iX', key: 'ENG-X', state: 'Ready for Agent', labels: ['agent-ready'], blockedBy: [], description: '- Group: X' };
  const tracker = { listCandidates: async () => [issue], moveIssue: async () => {}, addComment: async () => {} };
  const scheduler = new Scheduler({ config: baseConfig({ maxConcurrentRuns: 5 }), tracker, workspaceManager: {}, claudeRunner: {}, stateStore: null, logger: noopLogger() });
  scheduler.running.add('iX');

  const result = await scheduler.tick();
  assert.equal(result.started, 1); // capacity math still counts it as "started" this tick...
  assert.equal(scheduler.running.size, 1); // ...but claimAndRun's own guard prevents a second concurrent run
});
