'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { shellQuote, runShellCommand } = require('./claude-runner');

test('shellQuote wraps the value in single quotes and escapes embedded single quotes', () => {
  assert.equal(shellQuote('hello'), "'hello'");
  assert.equal(shellQuote("it's a test"), "'it'\\''s a test'");
});

test('runShellCommand runs a simple command and resolves with captured stdout', async () => {
  const { stdout } = await runShellCommand('printf %s', { cwd: process.cwd(), input: 'hi', timeoutMs: 5000 });
  assert.equal(stdout, 'hi');
});

test('runShellCommand substitutes {{prompt}} when present instead of appending', async () => {
  const { stdout } = await runShellCommand('printf "[%s]" {{prompt}}', { cwd: process.cwd(), input: 'x', timeoutMs: 5000 });
  assert.equal(stdout, '[x]');
});

test('runShellCommand rejects when the command exits non-zero', async () => {
  await assert.rejects(
    runShellCommand('bash -c "exit 3"', { cwd: process.cwd(), input: '', timeoutMs: 5000 }),
    /exited 3/
  );
});

test('runShellCommand rejects with a timeout error when the process runs too long', async () => {
  await assert.rejects(
    runShellCommand('sleep {{prompt}}', { cwd: process.cwd(), input: '5', timeoutMs: 100 }),
    /timed out after 100ms/
  );
});
