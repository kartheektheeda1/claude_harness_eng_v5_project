'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('Agent SDK runner binds an official AC to a bounded role and tool set', async () => {
  const { buildRunConfig, parseArgs } = await import('../../scripts/run-claimflow-agent.mjs');
  const args = parseArgs(['--ac', 'AC-05', '--mode', 'evaluate']);
  const config = buildRunConfig(args);
  assert.match(config.prompt, /AC-05/);
  assert.equal(config.options.model, 'opus');
  assert.ok(config.options.allowedTools.includes('mcp__playwright__browser_snapshot'));
  assert.ok(!config.options.allowedTools.includes('Write'));
});
