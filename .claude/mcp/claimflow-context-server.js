#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PROTOCOL_VERSION = '2024-11-05';

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8');
}

function acceptanceCriteria() {
  const text = read('specs/app_spec.md');
  const matches = [...text.matchAll(/^### (AC-\d{2}) - (.+)$/gm)];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.indexOf('\n## Non-Functional Requirements', start);
    return {
      id: match[1],
      title: match[2].trim(),
      text: text.slice(start, end < 0 ? text.length : end).trim()
    };
  });
}

function matrix() {
  const document = JSON.parse(read('specs/test_artefacts/verification-matrix.json'));
  return document.requirements || [];
}

function featureFiles() {
  return fs.readdirSync(path.join(PROJECT_ROOT, 'specs'))
    .filter((name) => name.endsWith('_spec.md') && name !== 'app_spec.md')
    .sort();
}

const tools = [
  {
    name: 'list_acceptance_criteria',
    description: 'List the canonical ClaimFlow AC-01 through AC-10 contracts.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'get_acceptance_criterion',
    description: 'Return one canonical acceptance criterion and its mapped feature specification.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', pattern: '^AC-[0-9]{2}$' } },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'get_verification_trace',
    description: 'Return the concrete tests and commands mapped to an acceptance criterion.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', pattern: '^AC-[0-9]{2}$' } },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'get_claimflow_rules',
    description: 'Return canonical NFRs, instruction files, and feature specifications.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  }
];

function featureFor(id) {
  for (const file of featureFiles()) {
    const text = read(`specs/${file}`);
    if (new RegExp(`^### ${id}(?:\\s|$)`, 'm').test(text)) return { path: `specs/${file}`, text };
  }
  return null;
}

function callTool(name, args = {}) {
  if (name === 'list_acceptance_criteria') return acceptanceCriteria();
  if (name === 'get_acceptance_criterion') {
    const criterion = acceptanceCriteria().find((item) => item.id === args.id);
    if (!criterion) throw new Error(`Unknown acceptance criterion: ${args.id}`);
    return { ...criterion, featureSpec: featureFor(args.id)?.path || null };
  }
  if (name === 'get_verification_trace') {
    const trace = matrix().find((item) => item.ac_id === args.id);
    if (!trace) throw new Error(`No verification trace for ${args.id}`);
    return trace;
  }
  if (name === 'get_claimflow_rules') {
    const app = read('specs/app_spec.md');
    const start = app.indexOf('## Non-Functional Requirements');
    const end = app.indexOf('## Out of Scope', start);
    return {
      nonFunctionalRequirements: app.slice(start, end).trim(),
      instructions: ['CLAUDE.md', 'src/CLAUDE.md', 'src/test/CLAUDE.md', 'frontend/CLAUDE.md'],
      featureSpecs: featureFiles().map((file) => `specs/${file}`),
      harnessLock: JSON.parse(read('harness-lock.json'))
    };
  }
  throw new Error(`Unknown tool: ${name}`);
}

function result(id, value) {
  return { jsonrpc: '2.0', id, result: value };
}

function error(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

function handle(message) {
  if (message.method === 'initialize') {
    return result(message.id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'claimflow-context', version: '1.0.0' }
    });
  }
  if (message.method === 'ping') return result(message.id, {});
  if (message.method === 'tools/list') return result(message.id, { tools });
  if (message.method === 'tools/call') {
    try {
      const value = callTool(message.params?.name, message.params?.arguments || {});
      return result(message.id, { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] });
    } catch (toolError) {
      return result(message.id, {
        isError: true,
        content: [{ type: 'text', text: toolError.message }]
      });
    }
  }
  if (message.method?.startsWith('notifications/')) return null;
  return error(message.id, -32601, `Method not found: ${message.method}`);
}

function start() {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      let response;
      try {
        response = handle(JSON.parse(line));
      } catch (parseError) {
        response = error(null, -32700, `Parse error: ${parseError.message}`);
      }
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  });
  process.stdin.on('end', () => process.exit(0));
}

if (require.main === module) start();

module.exports = { acceptanceCriteria, callTool, featureFor, handle, start, tools };
