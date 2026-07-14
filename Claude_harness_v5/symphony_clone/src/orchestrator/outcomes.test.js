'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { finishExecution, finishPlanning, resolveReviewOutcome } = require('./outcomes');

function fakeScheduler(overrides = {}) {
  const calls = { comments: [], moves: [], finishRun: [] };
  const sched = {
    config: {
      tracker: {
        blockedState: 'Blocked', blockedStateCandidates: ['Blocked'],
        reviewState: 'Human Review', reviewStateCandidates: ['Human Review'],
        plannedState: 'Planned', plannedStateCandidates: ['Planned']
      },
      github: { createPr: false, baseBranch: 'main' },
      autoMerge: { enabled: false }
    },
    tracker: {
      addComment: async (id, body) => calls.comments.push({ id, body }),
      moveIssue: async (id, state, candidates) => calls.moves.push({ id, state, candidates })
    },
    workspaceManager: { pushBranch: async () => {} },
    stateStore: { finishRun: (issue, patch) => calls.finishRun.push({ issue, patch }) },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    maybeCleanupWorkspace: async () => {},
    enableAutoMerge: async () => ({ enabled: false, reason: 'stub' }),
    ...overrides
  };
  return { sched, calls };
}

test('finishExecution moves a non-human_review result straight to blocked', async () => {
  const { sched, calls } = fakeScheduler();
  const issue = { id: 'i1', key: 'ENG-1' };
  const group = { id: 'A' };
  const runResult = { result: { status: 'blocked', blocker: 'missing secret' } };

  await finishExecution(sched, issue, group, { workspacePath: '/ws' }, runResult);

  assert.equal(calls.moves[0].state, 'Blocked');
  assert.equal(calls.finishRun[0].patch.status, 'blocked');
});

test('finishExecution on human_review pushes, opens a PR, and moves to review', async () => {
  const pushed = [];
  const { sched, calls } = fakeScheduler({
    workspaceManager: { pushBranch: async (ws, branch) => pushed.push({ ws, branch }) }
  });
  const issue = { id: 'i1', key: 'ENG-1' };
  const group = { id: 'A', stories: [] };
  const runResult = { result: { status: 'human_review', summary: 'done' } };
  const workspace = { workspacePath: '/ws', branchName: 'agent/ENG-1' };

  await finishExecution(sched, issue, group, workspace, runResult);

  assert.equal(pushed.length, 1);
  assert.equal(calls.moves[0].state, 'Human Review');
  assert.equal(calls.finishRun[0].patch.status, 'human_review');
});

test('finishPlanning moves a planned result to plannedState and records published groups', async () => {
  const { sched, calls } = fakeScheduler();
  const issue = { id: 'i1', key: 'ENG-9' };
  const runResult = { result: { status: 'planned', groups_published: ['A', 'B'] } };

  await finishPlanning(sched, issue, { id: 'ENG-9' }, { workspacePath: '/ws' }, runResult);

  assert.equal(calls.moves[0].state, 'Planned');
  assert.match(calls.comments[0].body, /Published groups: A, B/);
});

test('finishPlanning moves a non-planned result to blocked', async () => {
  const { sched, calls } = fakeScheduler();
  const runResult = { result: { status: 'blocked', blocker: 'no PRD file' } };

  await finishPlanning(sched, { id: 'i1', key: 'ENG-10' }, { id: 'ENG-10' }, { workspacePath: '/ws' }, runResult);

  assert.equal(calls.moves[0].state, 'Blocked');
  assert.match(calls.comments[0].body, /no PRD file/);
});

test('resolveReviewOutcome falls back to human review when auto-merge cannot be enabled', async () => {
  const { sched } = fakeScheduler({ config: { tracker: { reviewState: 'Human Review', reviewStateCandidates: ['Human Review'] }, autoMerge: { enabled: true, method: 'squash', doneState: 'Done', doneStateCandidates: ['Done'] } } });
  const outcome = await resolveReviewOutcome(sched, { id: 'i1' }, { workspacePath: '/ws' }, 'https://github.com/o/r/pull/1');
  assert.equal(outcome.runStatus, 'human_review');
  assert.equal(outcome.state, 'Human Review');
});

test('resolveReviewOutcome advances to doneState when auto-merge is enabled', async () => {
  const { sched } = fakeScheduler({
    config: { tracker: { reviewState: 'Human Review', reviewStateCandidates: ['Human Review'] }, autoMerge: { enabled: true, method: 'squash', doneState: 'Done', doneStateCandidates: ['Done'] } },
    enableAutoMerge: async () => ({ enabled: true })
  });
  const outcome = await resolveReviewOutcome(sched, { id: 'i1' }, { workspacePath: '/ws' }, 'https://github.com/o/r/pull/1');
  assert.equal(outcome.runStatus, 'auto_merge');
  assert.equal(outcome.state, 'Done');
});
