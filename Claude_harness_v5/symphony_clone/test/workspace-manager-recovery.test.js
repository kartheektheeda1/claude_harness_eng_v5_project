'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { WorkspaceManager, runCommand } = require('../src/orchestrator/workspace-manager');

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
  return { repoUrl, workspaceRoot, workspaceRetention: 'delete', github: { baseBranch: 'main', branchPrefix: 'agent' } };
}

function commitFile(workspacePath, filename, contents) {
  fs.writeFileSync(path.join(workspacePath, filename), contents);
  execFileSync('git', ['-C', workspacePath, 'add', '.']);
  execFileSync('git', ['-C', workspacePath, '-c', 'user.email=t@t.com', '-c', 'user.name=T', 'commit', '-q', '-m', filename]);
}

test('a retry with existing unpushed commits resumes instead of resetting them away', async () => {
  const remote = createBareRemote();
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-ws-'));
  const manager = new WorkspaceManager(testConfig(remote, workspaceRoot), runCommand);

  const firstAttempt = await manager.prepare({ key: 'ENG-1' }, { id: 'A' }, { attempt: 1 });
  commitFile(firstAttempt.workspacePath, 'work.txt', 'in progress\n');
  const beforeRetryHead = execFileSync('git', ['-C', firstAttempt.workspacePath, 'rev-parse', 'HEAD']).toString().trim();

  const secondAttempt = await manager.prepare({ key: 'ENG-1' }, { id: 'A' }, { attempt: 2 });

  assert.equal(secondAttempt.resumed, true);
  assert.equal(secondAttempt.commitsAhead, 1);
  const afterRetryHead = execFileSync('git', ['-C', secondAttempt.workspacePath, 'rev-parse', 'HEAD']).toString().trim();
  assert.equal(afterRetryHead, beforeRetryHead, 'the commit made before the retry must still be HEAD');
});

test('resuming tags the pre-retry HEAD as a recovery ref carrying the attempt number', async () => {
  const remote = createBareRemote();
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-ws-'));
  const manager = new WorkspaceManager(testConfig(remote, workspaceRoot), runCommand);

  const first = await manager.prepare({ key: 'ENG-2' }, { id: 'B' }, { attempt: 1 });
  commitFile(first.workspacePath, 'work.txt', 'hello\n');
  const resumed = await manager.prepare({ key: 'ENG-2' }, { id: 'B' }, { attempt: 5 });

  assert.match(resumed.backupRef, /^recovery\/agent\/ENG-2\/attempt-5-\d+-[0-9a-f]{8}$/);
  const tags = execFileSync('git', ['-C', resumed.workspacePath, 'tag', '--list', 'recovery/*']).toString();
  assert.match(tags, new RegExp(resumed.backupRef.replace(/\//g, '\\/')));
});

test('a retry with zero commits ahead of base falls back to the destructive reset path', async () => {
  const remote = createBareRemote();
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-ws-'));
  const manager = new WorkspaceManager(testConfig(remote, workspaceRoot), runCommand);

  await manager.prepare({ key: 'ENG-3' }, { id: 'C' }, { attempt: 1 }); // no commits made
  const second = await manager.prepare({ key: 'ENG-3' }, { id: 'C' }, { attempt: 2 });

  assert.equal(second.resumed, false);
});
