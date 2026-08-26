#!/usr/bin/env node
'use strict';

const {
  denyPreToolUse,
  extractToolPaths,
  isProductionPath,
  logHookError,
  readHookInput,
  readJson,
  resolveProjectRoot,
  statePath
} = require('./lib/claimflow-common');

function decision(input, projectRoot) {
  const paths = extractToolPaths(input, projectRoot);
  const production = paths.filter(isProductionPath);
  if (!production.length) return { allow: true, paths };
  const state = readJson(statePath(projectRoot, 'tdd-session.json'));
  if (!state || !['red', 'refactor'].includes(state.phase)) {
    return {
      allow: false,
      paths: production,
      reason: `Production edit requires a recorded red TDD phase. Blocked: ${production.join(', ')}. Run node .claude/scripts/tdd-cycle.js start/red first.`
    };
  }
  return { allow: true, paths: production, state };
}

if (require.main === module) {
  const projectRoot = resolveProjectRoot();
  try {
    const result = decision(readHookInput(), projectRoot);
    if (!result.allow) denyPreToolUse(result.reason);
  } catch (error) {
    logHookError(projectRoot, 'pre-write-tdd', error);
    denyPreToolUse(`ClaimFlow TDD hook failed closed: ${error.message}`);
  }
}

module.exports = { decision };
