'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { StateStore, retryTime } = require('../src/orchestrator/state-store');

function tempStateDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-state-'));
}

test('startRun then finishRun records a completed run with carried-forward fields', () => {
  const store = new StateStore({ stateDir: tempStateDir() });
  const issue = { id: 'i1', key: 'ENG-1' };

  store.startRun(issue, { groupId: 'A', branchName: 'agent/ENG-1' });
  store.finishRun(issue, { status: 'human_review', prUrl: 'https://github.com/o/r/pull/1' });

  const run = store.getRun(issue);
  assert.equal(run.status, 'human_review');
  assert.equal(run.branchName, 'agent/ENG-1');
  assert.equal(run.prUrl, 'https://github.com/o/r/pull/1');
  assert.equal(run.endedAt !== null, true);
});

test('recordFailure schedules a retry until maxAttempts is exhausted', () => {
  const store = new StateStore({ stateDir: tempStateDir() });
  const issue = { id: 'i1', key: 'ENG-2' };
  const options = { maxAttempts: 2, baseDelayMs: 1000, maxDelayMs: 10000, now: new Date('2026-01-01T00:00:00Z') };

  store.startRun(issue, { attempt: 1 });
  const first = store.recordFailure(issue, new Error('boom'), options);
  assert.equal(first.status, 'retry_wait');
  assert.equal(first.nextRetryAt, new Date('2026-01-01T00:00:01Z').toISOString());

  store.startRun(issue, { attempt: 2 });
  const second = store.recordFailure(issue, new Error('boom again'), options);
  assert.equal(second.status, 'failed');
  assert.equal(second.nextRetryAt, null);
});

test('dueForRetry is true with no run, no backoff timestamp, or an elapsed backoff', () => {
  const store = new StateStore({ stateDir: tempStateDir() });
  const issue = { id: 'i1', key: 'ENG-3' };
  assert.equal(store.dueForRetry(issue), true);

  store.updateRun(issue, { status: 'retry_wait', nextRetryAt: new Date(Date.now() - 1000).toISOString() });
  assert.equal(store.dueForRetry(issue), true);

  store.updateRun(issue, { status: 'retry_wait', nextRetryAt: new Date(Date.now() + 60000).toISOString() });
  assert.equal(store.dueForRetry(issue), false);
});

test('retryTime doubles the delay per attempt up to the configured ceiling', () => {
  const options = { baseDelayMs: 1000, maxDelayMs: 5000, now: new Date(0) };
  assert.equal(retryTime(1, options).getTime(), 1000);
  assert.equal(retryTime(2, options).getTime(), 2000);
  assert.equal(retryTime(3, options).getTime(), 4000);
  assert.equal(retryTime(10, options).getTime(), 5000); // capped
});

test('a fresh StateStore on an empty directory starts with no runs', () => {
  const store = new StateStore({ stateDir: tempStateDir() });
  assert.deepEqual(store.snapshot(), { version: 1, runs: {} });
});
