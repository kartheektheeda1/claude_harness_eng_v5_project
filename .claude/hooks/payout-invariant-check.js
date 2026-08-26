#!/usr/bin/env node
'use strict';
const { denyPreToolUse, extractToolPaths, readHookInput, resolveProjectRoot } = require('./lib/claimflow-common');

function inserted(input) {
  const value = input.tool_input || input.toolInput || {};
  return [value.content, value.new_string, value.newString, ...(value.edits || []).map((edit) => edit.new_string || edit.content)]
    .filter(Boolean).join('\n');
}
function decision(input, root) {
  const paths = extractToolPaths(input, root);
  const moneyPath = paths.some((file) => /src\/main\/java\/.+(domain|service)\/.+\.java$/i.test(file));
  const text = inserted(input);
  const floatingMoney = moneyPath && /\b(?:double|float)\b/i.test(text) && /amount|payout|deductible|copay|coPay|settlement|insured/i.test(text);
  return floatingMoney ? { allow: false, reason: 'ClaimFlow money invariant: use BigDecimal with explicit scale and rounding; floating-point money is blocked.' } : { allow: true };
}
if (require.main === module) { const root = resolveProjectRoot(); const result = decision(readHookInput(), root); if (!result.allow) denyPreToolUse(result.reason); }
module.exports = { decision };
