'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Scheduler } = require('../src/orchestrator/scheduler');

function baseConfig() {
  return {
    maxConcurrentRuns: 3,
    tracker: {
      readyState: 'Ready for Agent', runningState: 'In Progress',
      blockedState: 'Blocked', blockedStateCandidates: ['Blocked'],
      reviewState: 'Human Review', reviewStateCandidates: ['Human Review'],
      plannedState: 'Planned', plannedStateCandidates: ['Planned'],
      readyLabel: 'agent-ready', planLabel: 'agent-plan', featureLabel: 'agent-feature',
      terminalStates: ['Done']
    },
    retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 5000 },
    github: { branchPrefix: 'agent', baseBranch: 'main', createPr: false },
    autoMerge: { enabled: false }
  };
}

function harness() {
  const events = [];
  const tracker = {
    moveIssue: async (id, state) => events.push(['move', id, state]),
    addComment: async (id, body) => events.push(['comment', id, body])
  };
  const workspaceManager = { prepare: async () => ({ workspacePath: '/tmp/ws', branchName: 'agent/x' }) };
  const claudeRunner = { run: async () => { events.push(['claude_run']); } };
  const logger = { info: () => {}, warn: () => {}, error: (e, d) => events.push(['error', e, d]) };
  return { events, tracker, workspaceManager, claudeRunner, logger };
}

test('a plan-labeled issue is routed through the planning prompt and result contract', async () => {
  const { events, tracker, workspaceManager, claudeRunner, logger } = harness();
  const scheduler = new Scheduler({ config: baseConfig(), tracker, workspaceManager, claudeRunner, stateStore: null, logger });
  scheduler.claudeRunner.run = async (workspacePath, prompt) => {
    events.push(['prompt_kind', prompt.includes('PLANNING run') ? 'plan' : 'other']);
  };

  await scheduler.dispatchIssue({ id: 'i1', key: 'ENG-1', labels: ['agent-plan'], description: 'A PRD' });

  // readResult will fail (no real workspace on disk) and route to handleRunError -> blocked.
  assert.equal(events.some(([type, kind]) => type === 'prompt_kind' && kind === 'plan'), true);
});

test('a feature-labeled issue is routed through the brownfield feature prompt', async () => {
  const { events, tracker, workspaceManager, logger } = harness();
  const scheduler = new Scheduler({ config: baseConfig(), tracker, workspaceManager, claudeRunner: { run: async () => {} }, stateStore: null, logger });
  scheduler.claudeRunner.run = async (workspacePath, prompt) => {
    events.push(['prompt_kind', prompt.includes('BROWNFIELD FEATURE run') ? 'feature' : 'other']);
  };

  await scheduler.dispatchIssue({ id: 'i2', key: 'ENG-2', labels: ['agent-feature'], title: 'Add dark mode', description: '' });

  assert.equal(events.some(([type, kind]) => type === 'prompt_kind' && kind === 'feature'), true);
});

test('a ready-labeled issue is routed through the execution prompt with its parsed group', async () => {
  const { events, tracker, workspaceManager, logger } = harness();
  const scheduler = new Scheduler({ config: baseConfig(), tracker, workspaceManager, claudeRunner: { run: async () => {} }, stateStore: null, logger });
  scheduler.claudeRunner.run = async (workspacePath, prompt) => {
    events.push(['prompt_kind', prompt.includes('tracker group A') ? 'execute-A' : 'other']);
  };

  await scheduler.dispatchIssue({ id: 'i3', key: 'ENG-3', labels: ['agent-ready'], description: '- Group: A\n- Stories: S1' });

  assert.equal(events.some(([type, kind]) => type === 'prompt_kind' && kind === 'execute-A'), true);
});

test('claiming an issue always posts a claimed-comment before running Claude', async () => {
  const { events, tracker, workspaceManager, claudeRunner, logger } = harness();
  const scheduler = new Scheduler({ config: baseConfig(), tracker, workspaceManager, claudeRunner, stateStore: null, logger });

  await scheduler.dispatchIssue({ id: 'i4', key: 'ENG-4', labels: ['agent-ready'], description: '' });

  const commentIndex = events.findIndex((e) => e[0] === 'comment');
  const runIndex = events.findIndex((e) => e[0] === 'claude_run');
  assert.ok(commentIndex !== -1 && runIndex !== -1 && commentIndex < runIndex);
});
