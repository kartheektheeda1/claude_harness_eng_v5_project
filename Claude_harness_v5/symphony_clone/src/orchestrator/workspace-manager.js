'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');

class WorkspaceManager {
  constructor(config, runner = runCommand) {
    this.config = config;
    this.runner = runner;
  }

  // Clones on first use, then on every subsequent call: fetches the base branch
  // and either resumes an agent branch that already has unpushed commits (to
  // avoid discarding work from a run that failed after committing but before
  // pushing) or resets it fresh from the base branch.
  async prepare(issue, group, runMeta = {}) {
    const workspaceKey = safeWorkspaceKey(issue.key || group.id);
    const workspacePath = path.join(this.config.workspaceRoot, workspaceKey);
    const branchName = `${this.config.github.branchPrefix}/${workspaceKey}`;
    const baseRef = `origin/${this.config.github.baseBranch}`;

    await fs.mkdir(this.config.workspaceRoot, { recursive: true });

    const isFreshClone = !(await pathExists(path.join(workspacePath, '.git')));
    if (isFreshClone) {
      await runGit(this.runner, this.config.workspaceRoot, ['clone', this.config.repoUrl, workspacePath]);
    }

    await runGit(this.runner, workspacePath, ['fetch', 'origin', this.config.github.baseBranch]);

    if (!isFreshClone && await branchExists(this.runner, workspacePath, branchName)) {
      const commitsAhead = await countCommitsAhead(this.runner, workspacePath, branchName, baseRef);
      if (commitsAhead > 0) {
        return this.resumeExistingBranch(workspacePath, branchName, workspaceKey, commitsAhead, runMeta);
      }
    }

    await runGit(this.runner, workspacePath, ['checkout', '-B', branchName, baseRef]);
    return { workspacePath, branchName, workspaceKey, resumed: false };
  }

  async resumeExistingBranch(workspacePath, branchName, workspaceKey, commitsAhead, runMeta) {
    const backupRef = buildRecoveryTag(branchName, runMeta);
    await runGit(this.runner, workspacePath, ['checkout', branchName]);
    await runGit(this.runner, workspacePath, ['tag', backupRef, branchName]);
    return { workspacePath, branchName, workspaceKey, resumed: true, commitsAhead, backupRef };
  }

  async pushBranch(workspacePath, branchName) {
    await runGit(this.runner, workspacePath, ['push', '-u', 'origin', branchName, '--force-with-lease']);
  }

  async cleanup(workspacePath) {
    if (this.config.workspaceRetention === 'keep') return;

    const root = path.resolve(this.config.workspaceRoot);
    const target = path.resolve(workspacePath);
    if (target === root || !target.startsWith(root + path.sep)) {
      throw new Error(`Refusing to delete ${target}: outside workspaceRoot ${root}`);
    }

    await fs.rm(target, { recursive: true, force: true });
  }
}

// Allow-list for env vars passed to git child processes. git's config-driven exec
// hooks (core.sshCommand, filter.*.clean/smudge, core.fsmonitor, post-checkout)
// run with whatever env this function returns, so orchestrator secrets
// (GITHUB_TOKEN, LINEAR_API_KEY, any LLM key) must never appear here — only what
// git/ssh legitimately need to operate.
const GIT_ENV_ALLOWLIST = [
  /^PATH$/, /^HOME$/, /^USER$/, /^LOGNAME$/, /^SHELL$/, /^TERM$/,
  /^TMPDIR$/, /^TEMP$/, /^TMP$/,
  /^SSH_AUTH_SOCK$/, /^SSH_AGENT_PID$/,
  /^GIT_/, /^LANG$/, /^LANGUAGE$/, /^LC_/,
  /^https?_proxy$/i, /^all_proxy$/i, /^no_proxy$/i
];

function scrubbedGitEnv(sourceEnv = process.env) {
  const scrubbed = {};
  for (const key of Object.keys(sourceEnv)) {
    if (GIT_ENV_ALLOWLIST.some((pattern) => pattern.test(key))) scrubbed[key] = sourceEnv[key];
  }
  return scrubbed;
}

function runGit(runner, cwd, args) {
  return runner('git', ['-c', 'core.hooksPath=/dev/null', ...args], { cwd, env: scrubbedGitEnv(process.env) });
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_) {
    return false;
  }
}

async function branchExists(runner, cwd, branchName) {
  try {
    await runGit(runner, cwd, ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`]);
    return true; // exit 0: ref exists
  } catch (error) {
    if (error && error.code === 1) return false; // exit 1: genuinely absent
    throw error; // anything else is a real failure — don't mask it as "absent"
  }
}

async function countCommitsAhead(runner, cwd, branch, base) {
  const { stdout } = await runGit(runner, cwd, ['rev-list', '--count', '--end-of-options', `${base}..${branch}`]);
  const count = Number.parseInt((stdout || '').trim(), 10);
  return Number.isFinite(count) ? count : 0; // only non-numeric stdout maps to 0; a thrown error still propagates
}

function buildRecoveryTag(branchName, runMeta) {
  const attempt = runMeta && runMeta.attempt != null ? runMeta.attempt : 'unknown';
  const suffix = randomUUID().slice(0, 8);
  return `recovery/${branchName}/attempt-${attempt}-${Date.now()}-${suffix}`;
}

// Turns an arbitrary issue key / group id into something safe to use as both a
// directory name and a git ref component: strips anything outside
// [A-Za-z0-9._-], collapses repeated dots, trims leading/trailing dots and
// dashes, and caps length at 80. Falls back to "group" for inputs that would
// otherwise produce a malformed ref (empty, all-punctuation, or ending in
// ".lock", which git's check-ref-format forbids).
function safeWorkspaceKey(value) {
  const cleaned = String(value || 'group')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 80);

  if (!/[a-zA-Z0-9]/.test(cleaned) || cleaned.endsWith('.lock')) return 'group';
  return cleaned;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const error = new Error(`${command} ${args.join(' ')} failed with ${code}: ${stderr || stdout}`);
      error.code = code;
      error.stderr = stderr;
      reject(error);
    });
  });
}

module.exports = { WorkspaceManager, safeWorkspaceKey, runCommand, scrubbedGitEnv };
