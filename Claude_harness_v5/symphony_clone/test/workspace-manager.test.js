'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { WorkspaceManager, runCommand } = require('../src/orchestrator/workspace-manager');

// Builds a throwaway bare repo on local disk (no network) with one commit on
// main, so `git clone` in the tests under exercise is a plain local file path.
function createBareRemote() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-remote-'));
  const remotePath = path.join(root, 'origin.git');
  const seedPath = path.join(root, 'seed');
  execFileSync('git', ['init', '--bare', '-q', remotePath]);
  execFileSync('git', ['init', '-q', seedPath]);
  execFileSync('git', ['-C', seedPath, 'config', 'user.email', 'test@example.com']);
  execFileSync('git', ['-C', seedPath, 'config', 'user.name', 'Test']);
  fs.writeFileSync(path.join(seedPath, 'README.md'), 'seed\n');
  execFileSync('git', ['-C', seedPath, 'add', '.']);
  execFileSync('git', ['-C', seedPath, 'commit', '-q', '-m', 'initial']);
  execFileSync('git', ['-C', seedPath, 'branch', '-M', 'main']);
  execFileSync('git', ['-C', seedPath, 'remote', 'add', 'origin', remotePath]);
  execFileSync('git', ['-C', seedPath, 'push', '-q', 'origin', 'main']);
  return remotePath;
}

function testConfig(repoUrl, workspaceRoot) {
  return {
    repoUrl,
    workspaceRoot,
    workspaceRetention: 'delete',
    github: { baseBranch: 'main', branchPrefix: 'agent' }
  };
}

test('prepare() clones fresh and checks out a new agent branch from origin/main', async () => {
  const remote = createBareRemote();
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-ws-'));
  const manager = new WorkspaceManager(testConfig(remote, workspaceRoot), runCommand);

  const result = await manager.prepare({ key: 'ENG-1' }, { id: 'A' });

  assert.equal(result.resumed, false);
  assert.equal(result.branchName, 'agent/ENG-1');
  assert.equal(fs.existsSync(path.join(result.workspacePath, '.git')), true);
  const branch = execFileSync('git', ['-C', result.workspacePath, 'branch', '--show-current']).toString().trim();
  assert.equal(branch, 'agent/ENG-1');
});

test('prepare() is idempotent: calling twice with no local commits resets cleanly', async () => {
  const remote = createBareRemote();
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-ws-'));
  const manager = new WorkspaceManager(testConfig(remote, workspaceRoot), runCommand);

  const first = await manager.prepare({ key: 'ENG-2' }, { id: 'B' });
  const second = await manager.prepare({ key: 'ENG-2' }, { id: 'B' });

  assert.equal(first.resumed, false);
  assert.equal(second.resumed, false);
});

test('pushBranch pushes the agent branch to origin with --force-with-lease', async () => {
  const remote = createBareRemote();
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-ws-'));
  const manager = new WorkspaceManager(testConfig(remote, workspaceRoot), runCommand);

  const { workspacePath, branchName } = await manager.prepare({ key: 'ENG-3' }, { id: 'C' });
  fs.writeFileSync(path.join(workspacePath, 'change.txt'), 'hi\n');
  execFileSync('git', ['-C', workspacePath, 'add', '.']);
  execFileSync('git', ['-C', workspacePath, '-c', 'user.email=t@t.com', '-c', 'user.name=T', 'commit', '-q', '-m', 'change']);

  await manager.pushBranch(workspacePath, branchName);

  const remoteBranches = execFileSync('git', ['ls-remote', '--heads', remote]).toString();
  assert.match(remoteBranches, /refs\/heads\/agent\/ENG-3/);
});

test('cleanup removes the workspace directory unless retention is "keep"', async () => {
  const remote = createBareRemote();
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-ws-'));
  const manager = new WorkspaceManager(testConfig(remote, workspaceRoot), runCommand);
  const { workspacePath } = await manager.prepare({ key: 'ENG-4' }, { id: 'D' });

  await manager.cleanup(workspacePath);
  assert.equal(fs.existsSync(workspacePath), false);
});

test('cleanup is a no-op when workspaceRetention is "keep"', async () => {
  const remote = createBareRemote();
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-ws-'));
  const config = testConfig(remote, workspaceRoot);
  config.workspaceRetention = 'keep';
  const manager = new WorkspaceManager(config, runCommand);
  const { workspacePath } = await manager.prepare({ key: 'ENG-5' }, { id: 'E' });

  await manager.cleanup(workspacePath);
  assert.equal(fs.existsSync(workspacePath), true);
});
