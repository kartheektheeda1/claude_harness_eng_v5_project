#!/usr/bin/env node
'use strict';

const {
  appendJsonLine,
  extractToolPaths,
  logHookError,
  readHookInput,
  readJson,
  resolveProjectRoot,
  statePath
} = require('./lib/claimflow-common');

function record(input, projectRoot) {
  const paths = extractToolPaths(input, projectRoot);
  if (!paths.length) return 0;
  const tdd = readJson(statePath(projectRoot, 'tdd-session.json'));
  for (const file of paths) {
    appendJsonLine(statePath(projectRoot, 'changes.jsonl'), {
      timestamp: new Date().toISOString(),
      sessionId: input.session_id || input.sessionId || null,
      tool: input.tool_name || input.toolName || null,
      file,
      story: tdd ? tdd.story : null,
      acceptanceCriterion: tdd ? tdd.ac : null,
      tddPhase: tdd ? tdd.phase : null
    });
  }
  return paths.length;
}

if (require.main === module) {
  const projectRoot = resolveProjectRoot();
  try { record(readHookInput(), projectRoot); }
  catch (error) { logHookError(projectRoot, 'record-change', error); console.error(error.message); process.exitCode = 1; }
}

module.exports = { record };
