'use strict';

const fs = require('node:fs');
const path = require('node:path');

// state.json is the durable record of what the orchestrator has attempted per
// tracker issue: attempt counts, timestamps, retry backoff, and the workspace/PR
// it produced. Kept as a flat JSON file (fine up to roughly MAX_CONCURRENT_RUNS
// <= 5; a real database would be needed at larger scale).
class StateStore {
  constructor({ stateDir }) {
    this.stateDir = stateDir;
    this.statePath = path.join(stateDir, 'state.json');
    this.state = readStateFile(this.statePath);
  }

  getRun(issue) {
    return this.state.runs[issue.key] || null;
  }

  nextAttempt(issue) {
    const run = this.getRun(issue);
    return run ? (run.attempt || 0) + 1 : 1;
  }

  startRun(issue, details = {}) {
    const run = {
      issueId: issue.id,
      issueKey: issue.key,
      status: 'running',
      attempt: details.attempt || this.nextAttempt(issue),
      groupId: details.groupId || null,
      branchName: details.branchName || null,
      workspacePath: details.workspacePath || null,
      prUrl: details.prUrl || null,
      lastError: null,
      startedAt: new Date().toISOString(),
      endedAt: null,
      nextRetryAt: null
    };
    this.state.runs[issue.key] = run;
    this.save();
    return run;
  }

  updateRun(issue, patch) {
    const existing = this.getRun(issue) || this.startRun(issue);
    this.state.runs[issue.key] = { ...existing, ...patch };
    this.save();
    return this.state.runs[issue.key];
  }

  finishRun(issue, patch = {}) {
    const existing = this.getRun(issue) || {};
    return this.updateRun(issue, {
      status: patch.status || 'completed',
      endedAt: new Date().toISOString(),
      nextRetryAt: null,
      lastError: patch.lastError || null,
      branchName: carryForward(patch, existing, 'branchName'),
      workspacePath: carryForward(patch, existing, 'workspacePath'),
      prUrl: carryForward(patch, existing, 'prUrl')
    });
  }

  recordFailure(issue, error, options) {
    const existing = this.getRun(issue);
    const attempt = existing && existing.attempt ? existing.attempt : 1;
    const exhausted = attempt >= options.maxAttempts;

    const run = {
      ...(existing || { issueId: issue.id, issueKey: issue.key, attempt }),
      status: exhausted ? 'failed' : 'retry_wait',
      lastError: error.message,
      endedAt: new Date().toISOString(),
      nextRetryAt: exhausted ? null : nextRetryTime(attempt, options).toISOString()
    };
    this.state.runs[issue.key] = run;
    this.save();
    return run;
  }

  dueForRetry(issue, now = new Date()) {
    const run = this.getRun(issue);
    if (!run || run.status !== 'retry_wait') return true;
    if (!run.nextRetryAt) return true;
    return Date.parse(run.nextRetryAt) <= now.getTime();
  }

  snapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }

  save() {
    fs.mkdirSync(this.stateDir, { recursive: true });
    fs.writeFileSync(this.statePath, `${JSON.stringify(this.state, null, 2)}\n`);
  }
}

// patch may explicitly set a field to null/undefined (meaning "clear it"), which
// is different from simply not mentioning the field at all — so this checks for
// key presence rather than truthiness before falling back to the existing run.
function carryForward(patch, existing, field) {
  if (Object.prototype.hasOwnProperty.call(patch, field)) return patch[field];
  return existing[field] || null;
}

function readStateFile(statePath) {
  if (!fs.existsSync(statePath)) return { version: 1, runs: {} };
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function nextRetryTime(attempt, options) {
  const delay = Math.min(options.maxDelayMs, options.baseDelayMs * (2 ** Math.max(0, attempt - 1)));
  return new Date(options.now.getTime() + delay);
}

module.exports = { StateStore, retryTime: nextRetryTime };
