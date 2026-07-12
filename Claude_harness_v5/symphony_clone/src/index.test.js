'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTracker, makeSerializedTick } = require('./index');
const { LinearTracker } = require('./tracker/linear');
const { JiraTracker } = require('./tracker/jira');
const { AzureDevOpsTracker } = require('./tracker/azure');

test('createTracker picks the adapter matching config.provider', () => {
  assert.ok(createTracker({ provider: 'linear', linear: {} }) instanceof LinearTracker);
  assert.ok(createTracker({ provider: 'jira', jira: {} }) instanceof JiraTracker);
  assert.ok(createTracker({ provider: 'azure', azure: {} }) instanceof AzureDevOpsTracker);
});

test('createTracker throws for an unrecognized provider', () => {
  assert.throws(() => createTracker({ provider: 'trello' }), /Unsupported provider: trello/);
});

test('makeSerializedTick skips a tick that starts while the previous one is still running', async () => {
  let resolveFirst;
  let runCount = 0;
  const scheduler = {
    logger: { error: () => {} },
    tick: () => {
      runCount++;
      if (runCount === 1) return new Promise((resolve) => { resolveFirst = resolve; });
      return Promise.resolve({});
    }
  };

  const tick = makeSerializedTick(scheduler);
  const firstCall = tick(); // starts and hangs
  await tick(); // should be skipped because the first tick is in flight
  resolveFirst({});
  await firstCall;

  assert.equal(runCount, 1);
});

test('makeSerializedTick logs and swallows a failing tick instead of throwing', async () => {
  const errors = [];
  const scheduler = { logger: { error: (event, data) => errors.push({ event, data }) }, tick: async () => { throw new Error('tracker down'); } };
  const tick = makeSerializedTick(scheduler);

  await tick();
  assert.equal(errors.length, 1);
  assert.equal(errors[0].event, 'scheduler_tick_failed');
});
