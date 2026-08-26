#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  appendJsonLine,
  isTestPath,
  readJson,
  relativeProjectPath,
  resolveProjectRoot,
  sha256,
  statePath,
  writeJsonAtomic
} = require('../hooks/lib/claimflow-common');
const { AC_ID, OFFICIAL_AC_ID, STORY_ID } = require('./validate-specs');

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function commandAfterSeparator(args) {
  const index = args.indexOf('--');
  return index >= 0 ? args.slice(index + 1) : [];
}

function currentHead(projectRoot) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : null;
}

function testHash(projectRoot, relativePath) {
  const absolute = path.join(projectRoot, relativePath);
  return fs.existsSync(absolute) ? sha256(fs.readFileSync(absolute)) : null;
}

function normalizeExecutable(program, projectRoot) {
  if (process.platform !== 'win32') return program;
  if (program === 'npm') return 'npm.cmd';
  if (program === 'npx') return 'npx.cmd';
  if (program === './mvnw' || program === '.\\mvnw') return path.join(projectRoot, 'mvnw.cmd');
  return program;
}

function runCommand(projectRoot, command) {
  const [program, ...args] = command;
  const result = spawnSync(normalizeExecutable(program, projectRoot), args, {
    cwd: projectRoot,
    encoding: 'utf8',
    env: process.env,
    shell: false,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return {
    status: typeof result.status === 'number' ? result.status : null,
    signal: result.signal || null,
    error: result.error ? result.error.message : null,
    outputHash: sha256(`${result.stdout || ''}\n${result.stderr || ''}`)
  };
}

function receipt(projectRoot, state, phase, result, extra = {}) {
  appendJsonLine(statePath(projectRoot, 'tdd-evidence.jsonl'), {
    timestamp: new Date().toISOString(),
    story: state.story,
    acceptanceCriterion: state.ac,
    test: state.test,
    phase,
    command: state.command,
    exitCode: result.status,
    outputHash: result.outputHash,
    testHash: testHash(projectRoot, state.test),
    baseHead: state.baseHead,
    ...extra
  });
}

function start(projectRoot, args) {
  const story = option(args, '--story');
  const ac = option(args, '--ac');
  const rawTest = option(args, '--test');
  const official = OFFICIAL_AC_ID.test(String(ac || ''));
  if (!official && !STORY_ID.test(String(story || ''))) throw new Error('start requires --story E<number>-S<number> for legacy story ACs');
  if (!official && (!AC_ID.test(String(ac || '')) || !ac.startsWith(`${story}-AC`))) throw new Error('start requires AC-01..AC-10 or a matching --ac E<number>-S<number>-AC<number>');
  const test = relativeProjectPath(projectRoot, rawTest);
  if (!test || !isTestPath(test)) throw new Error('--test must be a test file inside the project');
  if (!fs.existsSync(path.join(projectRoot, test))) throw new Error(`test file does not exist: ${test}`);
  const state = {
    schemaVersion: 1,
    story: official ? 'OFFICIAL-CAPSTONE' : story,
    ac,
    test,
    phase: 'started',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    baseHead: currentHead(projectRoot)
  };
  writeJsonAtomic(statePath(projectRoot, 'tdd-session.json'), state);
  return state;
}

function red(projectRoot, args) {
  const file = statePath(projectRoot, 'tdd-session.json');
  const state = readJson(file);
  if (!state || state.phase !== 'started') throw new Error('red requires an active started TDD session');
  const reason = option(args.slice(0, Math.max(args.indexOf('--'), 0)), '--reason');
  if (!reason || reason.trim().length < 10) throw new Error('red requires --reason with the expected missing behavior');
  const command = commandAfterSeparator(args);
  if (!command.length) throw new Error('red requires a command after --');
  const result = runCommand(projectRoot, command);
  if (result.status === null) throw new Error(`red command could not run: ${result.error || result.signal || 'unknown error'}`);
  if (result.status === 0) throw new Error('red command passed; no failing-behavior evidence was recorded');
  state.phase = 'red';
  state.reason = reason.trim();
  state.command = command;
  state.redTestHash = testHash(projectRoot, state.test);
  state.updatedAt = new Date().toISOString();
  writeJsonAtomic(file, state);
  receipt(projectRoot, state, 'red', result, { reason: state.reason });
  return state;
}

function green(projectRoot, args) {
  const file = statePath(projectRoot, 'tdd-session.json');
  const state = readJson(file);
  if (!state || !['red', 'refactor'].includes(state.phase)) throw new Error('green requires an active red or refactor TDD session');
  const command = commandAfterSeparator(args);
  if (!command.length) throw new Error('green requires the same test command after --');
  if (JSON.stringify(command) !== JSON.stringify(state.command)) throw new Error('green must run exactly the command recorded in red');
  const currentTestHash = testHash(projectRoot, state.test);
  if (!currentTestHash || currentTestHash !== state.redTestHash) throw new Error('test changed after recorded red; restart the cycle and record a new red result');
  const result = runCommand(projectRoot, command);
  if (result.status === null) throw new Error(`green command could not run: ${result.error || result.signal || 'unknown error'}`);
  if (result.status !== 0) throw new Error(`green command failed with exit code ${result.status}`);
  state.phase = 'green';
  state.updatedAt = new Date().toISOString();
  state.greenHead = currentHead(projectRoot);
  writeJsonAtomic(file, state);
  receipt(projectRoot, state, 'green', result);
  return state;
}

function refactor(projectRoot) {
  const file = statePath(projectRoot, 'tdd-session.json');
  const state = readJson(file);
  if (!state || state.phase !== 'green') throw new Error('refactor requires an active green TDD session');
  state.phase = 'refactor';
  state.updatedAt = new Date().toISOString();
  writeJsonAtomic(file, state);
  return state;
}

function clear(projectRoot) {
  const file = statePath(projectRoot, 'tdd-session.json');
  const state = readJson(file);
  if (!state) return null;
  if (state.phase !== 'green') throw new Error('only a green TDD session can be cleared');
  fs.unlinkSync(file);
  return state;
}

function main(argv = process.argv.slice(2), projectRoot = resolveProjectRoot()) {
  const action = argv[0];
  const args = argv.slice(1);
  let result;
  if (action === 'start') result = start(projectRoot, args);
  else if (action === 'red') result = red(projectRoot, args);
  else if (action === 'green') result = green(projectRoot, args);
  else if (action === 'refactor') result = refactor(projectRoot);
  else if (action === 'clear') result = clear(projectRoot);
  else if (action === 'status') result = readJson(statePath(projectRoot, 'tdd-session.json'));
  else throw new Error('usage: tdd-cycle.js <start|red|green|refactor|clear|status> [options]');
  console.log(JSON.stringify(result || { phase: 'idle' }, null, 2));
  return result;
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(`TDD gate: ${error.message}`); process.exitCode = 1; }
}

module.exports = { clear, green, main, red, refactor, runCommand, start };
