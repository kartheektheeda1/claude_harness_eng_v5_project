#!/usr/bin/env node
'use strict';
const { denyPreToolUse, extractToolPaths, readHookInput, resolveProjectRoot } = require('./lib/claimflow-common');

function decision(input, root) {
  const paths = extractToolPaths(input, root);
  const value = input.tool_input || input.toolInput || {};
  const text = [value.content, value.new_string, value.newString, ...(value.edits || []).map((edit) => edit.new_string || edit.content)].filter(Boolean).join('\n');
  const javaProduction = paths.some((file) => file.startsWith('src/main/java/'));
  const sensitiveLog = javaProduction && /(?:log|logger)\s*\.\s*(?:info|debug|warn|error)\s*\([^\n]*(?:description|narrative|documentContent|credentials|password)/i.test(text);
  return sensitiveLog ? { allow: false, reason: 'ClaimFlow privacy invariant: narratives, document content, health data, and credentials must never be logged.' } : { allow: true };
}
if (require.main === module) { const root = resolveProjectRoot(); const result = decision(readHookInput(), root); if (!result.allow) denyPreToolUse(result.reason); }
module.exports = { decision };
