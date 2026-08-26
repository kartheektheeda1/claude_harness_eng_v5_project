#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { logHookError, outputJson, resolveProjectRoot } = require('./lib/claimflow-common');

function check(projectRoot) {
  const validator = path.join(projectRoot, '.claude', 'scripts', 'validate-harness.js');
  return spawnSync(process.execPath, [validator, '--allow-missing-specs'], {
    cwd: projectRoot,
    encoding: 'utf8',
    windowsHide: true
  });
}

if (require.main === module) {
  const projectRoot = resolveProjectRoot();
  try {
    const result = check(projectRoot);
    const summary = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
    outputJson({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: result.status === 0
          ? `ClaimFlow harness ready. ${summary}`
          : `ClaimFlow harness validation failed; repair before implementation. ${summary}`
      }
    });
    if (result.status !== 0) process.exitCode = 1;
  } catch (error) {
    logHookError(projectRoot, 'session-check', error);
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { check };
