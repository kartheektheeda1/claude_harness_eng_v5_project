'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { acceptanceCriteria, callTool, handle, tools } = require('../mcp/claimflow-context-server');

test('MCP server exposes canonical ClaimFlow tools and ten acceptance criteria', () => {
  assert.equal(acceptanceCriteria().length, 10);
  assert.deepEqual(acceptanceCriteria().map((item) => item.id), [
    'AC-01', 'AC-02', 'AC-03', 'AC-04', 'AC-05',
    'AC-06', 'AC-07', 'AC-08', 'AC-09', 'AC-10'
  ]);
  assert.ok(tools.some((tool) => tool.name === 'get_verification_trace'));
  assert.equal(callTool('get_verification_trace', { id: 'AC-05' }).ac_id, 'AC-05');
});

test('MCP JSON-RPC initialize and unknown tool responses are deterministic', () => {
  const initialized = handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  assert.equal(initialized.result.serverInfo.name, 'claimflow-context');
  const unknown = handle({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'unknown', arguments: {} } });
  assert.equal(unknown.result.isError, true);
});
