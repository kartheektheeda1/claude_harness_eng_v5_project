'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadConfig, parseEnvFile, loadEnvFile, DEFAULT_TERMINAL_STATES } = require('../src/config');

function linearEnv(overrides = {}) {
  return { TRACKER_PROVIDER: 'linear', TARGET_REPO_URL: 'git@github.com:o/r.git', LINEAR_API_KEY: 'k', LINEAR_PROJECT_SLUG: 's', ...overrides };
}

test('loadConfig requires TARGET_REPO_URL regardless of provider', () => {
  assert.throws(() => loadConfig({ TRACKER_PROVIDER: 'linear' }, { loadDotEnv: false }), /TARGET_REPO_URL is required/);
});

test('loadConfig validates each provider\'s required fields independently', () => {
  assert.throws(
    () => loadConfig({ TRACKER_PROVIDER: 'jira', TARGET_REPO_URL: 'x' }, { loadDotEnv: false }),
    /JIRA_BASE_URL is required for Jira/
  );
  assert.throws(
    () => loadConfig({ TRACKER_PROVIDER: 'azure', TARGET_REPO_URL: 'x' }, { loadDotEnv: false }),
    /AZURE_DEVOPS_ORG_URL is required for Azure DevOps/
  );
});

test('loadConfig normalizes Azure DevOps provider aliases', () => {
  const env = { TRACKER_PROVIDER: 'ado', TARGET_REPO_URL: 'x', AZURE_DEVOPS_ORG_URL: 'https://dev.azure.com/acme', AZURE_DEVOPS_PROJECT: 'Widgets', AZURE_DEVOPS_PAT: 'p' };
  assert.equal(loadConfig(env, { loadDotEnv: false }).provider, 'azure');
  assert.equal(loadConfig({ ...env, TRACKER_PROVIDER: 'azure-devops' }, { loadDotEnv: false }).provider, 'azure');
});

test('loadConfig rejects an unrecognized provider', () => {
  assert.throws(() => loadConfig(linearEnv({ TRACKER_PROVIDER: 'trello' }), { loadDotEnv: false }), /Unsupported TRACKER_PROVIDER: trello/);
});

test('loadConfig fills in default tracker states and terminal states', () => {
  const config = loadConfig(linearEnv(), { loadDotEnv: false });
  assert.equal(config.tracker.readyState, 'Ready for Agent');
  assert.deepEqual(config.tracker.terminalStates, DEFAULT_TERMINAL_STATES);
});

test('loadConfig splits comma-separated candidate lists and trims whitespace', () => {
  const config = loadConfig(linearEnv({ BLOCKED_STATE_CANDIDATES: 'Blocked,  Canceled ,Cancelled' }), { loadDotEnv: false });
  assert.deepEqual(config.tracker.blockedStateCandidates, ['Blocked', 'Canceled', 'Cancelled']);
});

test('loadConfig rejects a non-positive POLL_INTERVAL_MS', () => {
  assert.throws(() => loadConfig(linearEnv({ POLL_INTERVAL_MS: '0' }), { loadDotEnv: false }), /POLL_INTERVAL_MS must be a positive integer/);
});

test('loadConfig allows STATUS_PORT=0 to mean "disabled" without treating it as invalid', () => {
  const config = loadConfig(linearEnv({ STATUS_PORT: '0' }), { loadDotEnv: false });
  assert.equal(config.statusPort, 0);
});

test('loadConfig resolves MAX_WALLCLOCK_PER_RUN_MS, falling back to the legacy CLAUDE_TURN_TIMEOUT_MS alias', () => {
  const withLegacy = loadConfig(linearEnv({ CLAUDE_TURN_TIMEOUT_MS: '120000' }), { loadDotEnv: false });
  assert.equal(withLegacy.run.maxWallclockMs, 120000);

  const withNew = loadConfig(linearEnv({ MAX_WALLCLOCK_PER_RUN_MS: '60000', CLAUDE_TURN_TIMEOUT_MS: '120000' }), { loadDotEnv: false });
  assert.equal(withNew.run.maxWallclockMs, 60000);
});

test('loadConfig rejects an invalid WORKSPACE_RETENTION value', () => {
  assert.throws(() => loadConfig(linearEnv({ WORKSPACE_RETENTION: 'archive' }), { loadDotEnv: false }), /WORKSPACE_RETENTION must be one of/);
});

test('loadConfig strips trailing slashes from Jira and Azure base URLs', () => {
  const jiraConfig = loadConfig({ TRACKER_PROVIDER: 'jira', TARGET_REPO_URL: 'x', JIRA_BASE_URL: 'https://x.atlassian.net///', JIRA_EMAIL: 'e', JIRA_API_TOKEN: 't', JIRA_PROJECT_KEY: 'K' }, { loadDotEnv: false });
  assert.equal(jiraConfig.jira.baseUrl, 'https://x.atlassian.net');
});

test('parseEnvFile handles quotes, comments, and escaped newlines', () => {
  const parsed = parseEnvFile([
    '# a comment',
    'FOO=bar',
    'export BAZ=qux # trailing comment',
    'QUOTED="has spaces"',
    'MULTILINE="line one\\nline two"',
    '',
    'malformed line without equals'
  ].join('\n'));

  assert.equal(parsed.FOO, 'bar');
  assert.equal(parsed.BAZ, 'qux');
  assert.equal(parsed.QUOTED, 'has spaces');
  assert.equal(parsed.MULTILINE, 'line one\nline two');
  assert.equal('malformed' in parsed, false);
});

test('loadEnvFile only fills in keys the caller has not already set', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-env-'));
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(envPath, 'TRACKER_PROVIDER=linear\nLINEAR_API_KEY=from-file\n');

  const env = { LINEAR_API_KEY: 'from-process' };
  loadEnvFile(env, envPath);

  assert.equal(env.TRACKER_PROVIDER, 'linear');
  assert.equal(env.LINEAR_API_KEY, 'from-process'); // pre-existing value wins
});

test('loadEnvFile is a no-op when the file does not exist', () => {
  const env = { FOO: 'bar' };
  const result = loadEnvFile(env, '/nonexistent/path/.env');
  assert.deepEqual(result, { FOO: 'bar' });
});
