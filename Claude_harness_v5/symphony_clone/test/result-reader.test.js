'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { readResult, buildProofComment } = require('../src/orchestrator/result-reader');

async function tempWorkspace() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'symphony-ws-'));
}

test('readResult parses the JSON file at the group-scoped result path', async () => {
  const workspace = await tempWorkspace();
  const dir = path.join(workspace, '.claude', 'state', 'tracker-runs', 'A');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'result.json'), JSON.stringify({ status: 'human_review', summary: 'done' }));

  const { result, path: resultPath } = await readResult(workspace, 'A');
  assert.equal(result.status, 'human_review');
  assert.equal(resultPath.endsWith('tracker-runs/A/result.json'), true);
});

test('readResult rejects a result file with no status field', async () => {
  const workspace = await tempWorkspace();
  const dir = path.join(workspace, '.claude', 'state', 'tracker-runs', 'B');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'result.json'), JSON.stringify({ summary: 'no status here' }));

  await assert.rejects(readResult(workspace, 'B'), /missing status/);
});

test('readResult rejects when the file does not exist', async () => {
  const workspace = await tempWorkspace();
  await assert.rejects(readResult(workspace, 'missing-group'));
});

test('buildProofComment includes the PR link and formats list sections', () => {
  const issue = { key: 'ENG-1' };
  const group = { id: 'A' };
  const runResult = { result: { status: 'human_review', summary: 'Implemented A', branch: 'agent/ENG-1', commit: 'abc123', tests: ['npm test: passed'], reports: ['specs/reviews/evaluator-report.md'], features_updated: ['F001'] } };

  const comment = buildProofComment(issue, group, runResult, 'https://github.com/o/r/pull/9');
  assert.match(comment, /- Tracker: ENG-1/);
  assert.match(comment, /- PR: https:\/\/github\.com\/o\/r\/pull\/9/);
  assert.match(comment, /- npm test: passed/);
  assert.match(comment, /- F001/);
});

test('buildProofComment appends a Blocker section only when present', () => {
  const runResult = { result: { status: 'blocked', blocker: 'Missing DATABASE_URL' } };
  const comment = buildProofComment({ key: 'ENG-2' }, { id: 'B' }, runResult, null);
  assert.match(comment, /### Blocker\nMissing DATABASE_URL/);
  assert.doesNotMatch(comment, /- PR:/);
});
