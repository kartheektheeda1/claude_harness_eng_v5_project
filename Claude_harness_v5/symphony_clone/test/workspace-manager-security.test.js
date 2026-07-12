'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { WorkspaceManager, safeWorkspaceKey, scrubbedGitEnv } = require('../src/orchestrator/workspace-manager');

test('safeWorkspaceKey strips unsafe characters and caps length at 80', () => {
  assert.equal(safeWorkspaceKey('ENG-101'), 'ENG-101');
  assert.equal(safeWorkspaceKey('weird/../key with spaces'), 'weird-.-key-with-spaces');
  assert.equal(safeWorkspaceKey('a'.repeat(200)).length, 80);
});

test('safeWorkspaceKey falls back to "group" for degenerate input', () => {
  assert.equal(safeWorkspaceKey(''), 'group');
  assert.equal(safeWorkspaceKey('...'), 'group');
  assert.equal(safeWorkspaceKey('---'), 'group');
  assert.equal(safeWorkspaceKey('name.lock'), 'group');
});

test('safeWorkspaceKey collapses repeated dots so refs stay well-formed', () => {
  assert.equal(safeWorkspaceKey('a....b'), 'a.b');
});

test('cleanup refuses to delete a path outside workspaceRoot', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-root-'));
  const outsidePath = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-outside-'));
  const manager = new WorkspaceManager({ workspaceRoot, workspaceRetention: 'delete' });

  await assert.rejects(manager.cleanup(outsidePath), /Refusing to delete/);
  assert.equal(fs.existsSync(outsidePath), true);
});

test('cleanup refuses to delete workspaceRoot itself', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-root-'));
  const manager = new WorkspaceManager({ workspaceRoot, workspaceRetention: 'delete' });

  await assert.rejects(manager.cleanup(workspaceRoot), /Refusing to delete/);
});

test('cleanup rejects a sibling directory whose name merely starts with workspaceRoot', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-root-'));
  const sibling = `${workspaceRoot}-evil`;
  fs.mkdirSync(sibling);
  const manager = new WorkspaceManager({ workspaceRoot, workspaceRetention: 'delete' });

  await assert.rejects(manager.cleanup(sibling), /Refusing to delete/);
  fs.rmSync(sibling, { recursive: true, force: true });
});

test('scrubbedGitEnv keeps only the allow-listed variables, dropping secrets', () => {
  const scrubbed = scrubbedGitEnv({
    PATH: '/usr/bin', HOME: '/home/node', GIT_AUTHOR_NAME: 'x',
    GITHUB_TOKEN: 'super-secret', LINEAR_API_KEY: 'also-secret', OPENAI_API_KEY: 'nope'
  });
  assert.equal(scrubbed.PATH, '/usr/bin');
  assert.equal(scrubbed.GIT_AUTHOR_NAME, 'x');
  assert.equal('GITHUB_TOKEN' in scrubbed, false);
  assert.equal('LINEAR_API_KEY' in scrubbed, false);
  assert.equal('OPENAI_API_KEY' in scrubbed, false);
});
