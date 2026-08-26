#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  blockStop,
  logHookError,
  readHookInput,
  readJson,
  resolveProjectRoot,
  statePath
} = require('./lib/claimflow-common');

function evaluateCompletion(projectRoot) {
  const tdd = readJson(statePath(projectRoot, 'tdd-session.json'));
  if (tdd && ['started', 'red', 'refactor'].includes(tdd.phase)) {
    return { allow: false, reason: `Active ${tdd.phase} TDD cycle for ${tdd.ac} is not green.` };
  }
  const validator = path.join(projectRoot, '.claude', 'scripts', 'validate-harness.js');
  const result = spawnSync(process.execPath, [validator, '--allow-missing-specs'], {
    cwd: projectRoot,
    encoding: 'utf8',
    windowsHide: true
  });
  if (result.status !== 0) {
    const lines = `${result.stdout || ''}\n${result.stderr || ''}`.trim().split(/\r?\n/).slice(0, 8).join(' | ');
    return { allow: false, reason: `ClaimFlow harness/spec gate failed: ${lines}` };
  }
  return { allow: true };
}

if (require.main === module) {
  const projectRoot = resolveProjectRoot();
  try {
    const input = readHookInput();
    if (!input.stop_hook_active) {
      const result = evaluateCompletion(projectRoot);
      if (!result.allow) blockStop(result.reason);
    }
  } catch (error) {
    logHookError(projectRoot, 'completion-gate', error);
    blockStop(`ClaimFlow completion hook failed closed: ${error.message}`);
  }
}

module.exports = { evaluateCompletion };
