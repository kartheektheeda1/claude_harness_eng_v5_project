'use strict';

const { spawn } = require('node:child_process');

class ClaudeRunner {
  constructor(config) {
    this.config = config;
  }

  async run(workspacePath, prompt) {
    const timeoutMs = (this.config.run && this.config.run.maxWallclockMs)
      || Number(process.env.CLAUDE_TURN_TIMEOUT_MS || 3600000);
    return runInShell(this.config.claudeCommand, { cwd: workspacePath, input: prompt, timeoutMs });
  }
}

// The child is spawned detached, leading its own process group, so a timeout
// kill reaches the whole tree. A bare SIGTERM to `bash -lc "claude ..."` would
// only stop the shell, not the claude process it spawned underneath, leaving it
// orphaned mid-run (and still billing).
function spawnDetachedShell(fullCommand, cwd) {
  const shell = process.env.SHELL || '/bin/bash';
  return spawn(shell, ['-lc', fullCommand], {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
}

function killProcessGroup(child) {
  try {
    process.kill(-child.pid, 'SIGTERM'); // negative pid = whole process group
  } catch (_) {
    child.kill('SIGTERM'); // group already gone; best effort on the child itself
  }
}

function captureOutput(child) {
  const captured = { stdout: '', stderr: '' };
  child.stdout.on('data', (chunk) => {
    captured.stdout += chunk.toString();
    process.stdout.write(chunk);
  });
  child.stderr.on('data', (chunk) => {
    captured.stderr += chunk.toString();
    process.stderr.write(chunk);
  });
  return captured;
}

function runInShell(command, { cwd, input, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const fullCommand = command.includes('{{prompt}}')
      ? command.replace('{{prompt}}', shellQuote(input))
      : `${command} ${shellQuote(input)}`;

    const child = spawnDetachedShell(fullCommand, cwd);
    const captured = captureOutput(child);
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      killProcessGroup(child);
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command}`));
    }, timeoutMs);

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) resolve({ stdout: captured.stdout, stderr: captured.stderr });
      else reject(new Error(`Command exited ${code}: ${captured.stderr || captured.stdout}`));
    });
  });
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

module.exports = { ClaudeRunner, runShellCommand: runInShell, shellQuote };
