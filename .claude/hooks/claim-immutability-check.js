#!/usr/bin/env node
'use strict';
const { denyPreToolUse, extractToolPaths, readHookInput, resolveProjectRoot } = require('./lib/claimflow-common');

function decision(input, root) {
  const paths = extractToolPaths(input, root);
  const value = input.tool_input || input.toolInput || {};
  const text = [value.content, value.new_string, value.newString, ...(value.edits || []).map((edit) => edit.new_string || edit.content)].filter(Boolean).join('\n');
  const evidenceFile = paths.some((file) => /(?:Settlement|AuditEvent|Record)\.java$/i.test(file) && file.startsWith('src/main/java/com/claimflow/domain/'));
  const mutator = /\bpublic\s+void\s+(?:set|update|delete|remove)[A-Z_]?[A-Za-z0-9_]*\s*\(/.test(text);
  return evidenceFile && mutator ? { allow: false, reason: 'ClaimFlow evidence invariant: settlement, audit, and evidence entities are append-only and may not expose mutators.' } : { allow: true };
}
if (require.main === module) { const root = resolveProjectRoot(); const result = decision(readHookInput(), root); if (!result.allow) denyPreToolUse(result.reason); }
module.exports = { decision };
