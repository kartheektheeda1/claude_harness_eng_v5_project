#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VALID_MODES = new Set(['plan', 'implement', 'evaluate']);

export function parseArgs(argv) {
  const result = { mode: 'plan', execute: false };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--ac') result.ac = argv[++index];
    else if (item === '--mode') result.mode = argv[++index];
    else if (item === '--execute') result.execute = true;
    else throw new Error(`Unknown argument: ${item}`);
  }
  if (!/^AC-\d{2}$/.test(result.ac || '')) throw new Error('--ac AC-NN is required');
  if (!VALID_MODES.has(result.mode)) throw new Error('--mode must be plan, implement, or evaluate');
  return result;
}

function criterion(id) {
  const text = fs.readFileSync(path.join(ROOT, 'specs', 'app_spec.md'), 'utf8');
  const marker = new RegExp(`^### ${id} - (.+)$`, 'm');
  const match = marker.exec(text);
  if (!match) throw new Error(`Unknown acceptance criterion: ${id}`);
  const start = match.index + match[0].length;
  const next = text.indexOf('\n### AC-', start);
  const sectionEnd = text.indexOf('\n## Non-Functional Requirements', start);
  const end = next >= 0 ? next : sectionEnd >= 0 ? sectionEnd : text.length;
  return { id, title: match[1].trim(), contract: text.slice(start, end).trim() };
}

export function buildRunConfig(args) {
  const ac = criterion(args.ac);
  const role = args.mode === 'evaluate' ? 'independent evaluator' : args.mode === 'implement' ? 'implementation agent' : 'planning agent';
  const prompt = [
    `You are the ClaimFlow ${role}.`,
    `Work only on ${ac.id}: ${ac.title}.`,
    ac.contract,
    'Read CLAUDE.md, the matching feature spec, sprint contract, and verification matrix before acting.',
    args.mode === 'implement'
      ? 'Use acceptance-test-first development. Preserve red/green evidence and do not merge or self-approve.'
      : args.mode === 'evaluate'
        ? 'Do not edit production code. Re-run mapped checks and write an evidence-backed evaluator report.'
        : 'Do not edit production code. Produce a bounded plan with tests, risks, migrations, and rollback.'
  ].join('\n\n');
  const allowedTools = args.mode === 'plan'
    ? ['Read', 'Glob', 'Grep']
    : args.mode === 'evaluate'
      ? ['Read', 'Glob', 'Grep', 'Bash', 'mcp__claimflow_context__get_acceptance_criterion', 'mcp__claimflow_context__get_verification_trace', 'mcp__playwright__browser_navigate', 'mcp__playwright__browser_snapshot']
      : ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash', 'mcp__claimflow_context__get_acceptance_criterion', 'mcp__claimflow_context__get_verification_trace'];
  return {
    prompt,
    options: {
      cwd: ROOT,
      model: args.mode === 'evaluate' ? 'opus' : 'sonnet',
      maxTurns: args.mode === 'plan' ? 8 : 30,
      allowedTools,
      settingSources: ['project'],
      permissionMode: 'default'
    }
  };
}

async function execute(config, args) {
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  const directory = path.join(ROOT, '.claude', 'state', 'agent-runs');
  fs.mkdirSync(directory, { recursive: true });
  const receipt = path.join(directory, `${new Date().toISOString().replaceAll(':', '-')}-${args.mode}-${args.ac}.jsonl`);
  for await (const message of query(config)) {
    fs.appendFileSync(receipt, `${JSON.stringify(message)}\n`);
    if (message.type === 'assistant') {
      for (const block of message.message?.content || []) if (block.type === 'text') process.stdout.write(`${block.text}\n`);
    }
  }
  process.stdout.write(`Agent receipt: ${path.relative(ROOT, receipt)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = buildRunConfig(args);
  if (!args.execute) {
    process.stdout.write(`${JSON.stringify({ dryRun: true, ac: args.ac, mode: args.mode, options: config.options }, null, 2)}\n`);
    process.stdout.write('Pass --execute only from an authenticated Claude Code environment.\n');
    return;
  }
  await execute(config, args);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`claimflow-agent: ${error.message}\n`);
    process.exitCode = 1;
  });
}
