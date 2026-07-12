'use strict';

// Central configuration loader. Everything else in the orchestrator receives a
// plain `config` object built here rather than reading process.env directly, so
// tests can inject arbitrary env maps without touching the real process.

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_TERMINAL_STATES = ['Done', 'Closed', 'Canceled', 'Cancelled', 'Duplicate'];
const DEFAULT_MAX_WALLCLOCK_MS = 7200000;
const WORKSPACE_RETENTION_VALUES = ['delete', 'keep'];
const MERGE_METHOD_VALUES = ['merge', 'squash', 'rebase'];
const PROVIDER_ALIASES = {
  ado: 'azure',
  azuredevops: 'azure',
  'azure-devops': 'azure',
  azure_devops: 'azure'
};

function loadConfig(env = process.env, options = {}) {
  hydrateFromDotEnvFile(env, options);

  const workspaceRoot = env.WORKSPACE_ROOT || '/workspaces';
  const config = {
    provider: normalizeProvider(env.TRACKER_PROVIDER),
    repoUrl: env.TARGET_REPO_URL || '',
    workspaceRoot,
    workspaceRetention: readWorkspaceRetention(env),
    stateDir: env.STATE_DIR || path.join(workspaceRoot, '.symphony'),
    logRoot: env.LOG_ROOT || path.join(workspaceRoot, '.symphony', 'logs'),
    pollIntervalMs: readScopedInt(env, 'POLL_INTERVAL_MS', 60000),
    maxConcurrentRuns: readScopedInt(env, 'MAX_CONCURRENT_RUNS', 1),
    claudeCommand: env.CLAUDE_COMMAND || 'claude --print --permission-mode bypassPermissions',
    statusPort: readScopedInt(env, 'STATUS_PORT', 0, { allowZero: true }),
    run: { maxWallclockMs: readMaxWallclockMs(env) },
    retry: buildRetrySection(env),
    github: buildGithubSection(env),
    autoMerge: buildAutoMergeSection(env),
    tracker: buildTrackerSection(env),
    linear: buildLinearSection(env),
    jira: buildJiraSection(env),
    azure: buildAzureSection(env)
  };

  validateConfig(config);
  return config;
}

function validateConfig(config) {
  if (!config.repoUrl) {
    throw new Error('TARGET_REPO_URL is required');
  }

  const validators = {
    linear: () => {
      if (!config.linear.apiKey) throw new Error('LINEAR_API_KEY is required for Linear');
      if (!config.linear.projectSlug) throw new Error('LINEAR_PROJECT_SLUG is required for Linear');
    },
    jira: () => {
      if (!config.jira.baseUrl) throw new Error('JIRA_BASE_URL is required for Jira');
      if (!config.jira.email) throw new Error('JIRA_EMAIL is required for Jira');
      if (!config.jira.apiToken) throw new Error('JIRA_API_TOKEN is required for Jira');
      if (!config.jira.projectKey) throw new Error('JIRA_PROJECT_KEY is required for Jira');
    },
    azure: () => {
      if (!config.azure.orgUrl) throw new Error('AZURE_DEVOPS_ORG_URL is required for Azure DevOps');
      if (!config.azure.project) throw new Error('AZURE_DEVOPS_PROJECT is required for Azure DevOps');
      if (!config.azure.pat) throw new Error('AZURE_DEVOPS_PAT is required for Azure DevOps');
    }
  };

  const validate = validators[config.provider];
  if (!validate) throw new Error(`Unsupported TRACKER_PROVIDER: ${config.provider}`);
  validate();
}

// --- section builders -------------------------------------------------------

function buildRetrySection(env) {
  return {
    maxAttempts: readScopedInt(env, 'MAX_RETRY_ATTEMPTS', 3),
    baseDelayMs: readScopedInt(env, 'RETRY_BASE_DELAY_MS', 60000),
    maxDelayMs: readScopedInt(env, 'RETRY_MAX_DELAY_MS', 900000)
  };
}

function buildGithubSection(env) {
  return {
    baseBranch: env.GITHUB_BASE_BRANCH || 'main',
    branchPrefix: env.BRANCH_PREFIX || 'agent',
    createPr: env.CREATE_PR !== 'false'
  };
}

function buildAutoMergeSection(env) {
  return {
    enabled: env.AUTO_MERGE === 'true',
    method: readMergeMethod(env.MERGE_METHOD),
    doneState: env.DONE_STATE || 'Done',
    doneStateCandidates: splitCsv(env.DONE_STATE_CANDIDATES, ['Done', 'Merged', 'Closed'])
  };
}

function buildTrackerSection(env) {
  return {
    readyState: env.READY_STATE || 'Ready for Agent',
    runningState: env.RUNNING_STATE || 'In Progress',
    reviewState: env.REVIEW_STATE || 'Human Review',
    blockedState: env.BLOCKED_STATE || 'Blocked',
    reviewStateCandidates: splitCsv(env.REVIEW_STATE_CANDIDATES, ['Human Review', 'In Review', 'Review']),
    blockedStateCandidates: splitCsv(env.BLOCKED_STATE_CANDIDATES, ['Blocked', 'Canceled', 'Cancelled']),
    readyLabel: env.READY_LABEL || 'agent-ready',
    planLabel: env.PLAN_LABEL || 'agent-plan',
    featureLabel: env.FEATURE_LABEL || 'agent-feature',
    plannedState: env.PLANNED_STATE || 'Planned',
    plannedStateCandidates: splitCsv(env.PLANNED_STATE_CANDIDATES, ['Planned', 'Ready for Agent']),
    terminalStates: splitCsv(env.TERMINAL_STATES, DEFAULT_TERMINAL_STATES)
  };
}

function buildLinearSection(env) {
  return {
    apiKey: env.LINEAR_API_KEY || '',
    projectSlug: env.LINEAR_PROJECT_SLUG || '',
    apiUrl: env.LINEAR_API_URL || 'https://api.linear.app/graphql'
  };
}

function buildJiraSection(env) {
  return {
    baseUrl: stripTrailingSlashes(env.JIRA_BASE_URL),
    email: env.JIRA_EMAIL || '',
    apiToken: env.JIRA_API_TOKEN || '',
    projectKey: env.JIRA_PROJECT_KEY || ''
  };
}

function buildAzureSection(env) {
  const orgUrl = stripTrailingSlashes(env.AZURE_DEVOPS_ORG_URL);
  const project = env.AZURE_DEVOPS_PROJECT || '';
  return {
    orgUrl,
    project,
    pat: env.AZURE_DEVOPS_PAT || '',
    baseUrl: orgUrl && project ? `${orgUrl}/${encodeURIComponent(project)}` : ''
  };
}

// --- primitive readers -------------------------------------------------------

function normalizeProvider(raw) {
  const provider = (raw || 'linear').trim().toLowerCase();
  return PROVIDER_ALIASES[provider] || provider;
}

function readWorkspaceRetention(env) {
  const value = (env.WORKSPACE_RETENTION || 'delete').trim().toLowerCase();
  if (!WORKSPACE_RETENTION_VALUES.includes(value)) {
    throw new Error(`WORKSPACE_RETENTION must be one of: ${WORKSPACE_RETENTION_VALUES.join(', ')}`);
  }
  return value;
}

function readMergeMethod(raw) {
  const method = (raw || 'merge').trim().toLowerCase();
  if (!MERGE_METHOD_VALUES.includes(method)) {
    throw new Error(`MERGE_METHOD must be one of: ${MERGE_METHOD_VALUES.join(', ')}`);
  }
  return method;
}

function readMaxWallclockMs(env) {
  for (const name of ['MAX_WALLCLOCK_PER_RUN_MS', 'CLAUDE_TURN_TIMEOUT_MS']) {
    const raw = env[name];
    if (raw === undefined || raw === '') continue;
    return parsePositiveInt(name, raw);
  }
  return DEFAULT_MAX_WALLCLOCK_MS;
}

function parsePositiveInt(name, raw) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return parsePositiveInt(name, raw);
}

// Some numeric settings need to be read from an arbitrary `env` map (for tests)
// rather than the real process.env, but intFromEnv's error messages reference
// process.env by design. This temporarily projects the value onto process.env,
// reads it, then restores whatever was there before — so tests never leak state.
function readScopedInt(env, name, fallback, { allowZero = false } = {}) {
  const previous = process.env[name];
  const hasOverride = Object.prototype.hasOwnProperty.call(env, name);
  if (hasOverride) process.env[name] = env[name];

  try {
    if (allowZero && process.env[name] === '0') return 0;
    return intFromEnv(name, fallback);
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

function splitCsv(raw, fallback) {
  if (!raw) return fallback;
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

function stripTrailingSlashes(raw) {
  return (raw || '').replace(/\/+$/, '');
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// --- .env file support -------------------------------------------------------

// Only auto-loads .env when the caller is reading the real process.env (or
// explicitly opts in via options.loadDotEnv) — tests that pass a synthetic env
// object default to skipping disk I/O entirely.
function hydrateFromDotEnvFile(env, options) {
  const shouldLoad = Object.prototype.hasOwnProperty.call(options, 'loadDotEnv')
    ? options.loadDotEnv
    : env === process.env;
  if (shouldLoad) loadEnvFile(env);
}

function loadEnvFile(env = process.env, envPath = path.resolve(process.cwd(), '.env')) {
  if (!fs.existsSync(envPath)) return env;

  const parsed = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    const alreadySet = Object.prototype.hasOwnProperty.call(env, key) && env[key] !== '';
    if (!alreadySet) env[key] = value;
  }
  return env;
}

function parseEnvFile(raw) {
  const result = {};

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rest] = match;
    result[key] = unwrapEnvValue(rest.trim());
  }

  return result;
}

function unwrapEnvValue(value) {
  const isQuoted = (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
  let unwrapped = value;

  if (isQuoted) {
    unwrapped = value.slice(1, -1);
  } else {
    const commentAt = value.indexOf(' #');
    if (commentAt !== -1) unwrapped = value.slice(0, commentAt).trim();
  }

  return unwrapped.replace(/\\n/g, '\n');
}

module.exports = {
  loadConfig,
  validateConfig,
  loadEnvFile,
  parseEnvFile,
  DEFAULT_TERMINAL_STATES,
  requiredEnv
};
