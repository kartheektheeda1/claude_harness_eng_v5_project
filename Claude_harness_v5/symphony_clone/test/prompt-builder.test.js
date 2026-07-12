'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHarnessPrompt, buildFeaturePrompt, groupFromIssue, resolveHarnessCommand } = require('../src/orchestrator/prompt-builder');

test('resolveHarnessCommand uses HARNESS_COMMAND_TEMPLATE by default', () => {
  const previous = process.env.HARNESS_COMMAND_TEMPLATE;
  delete process.env.HARNESS_COMMAND_TEMPLATE;
  try {
    assert.equal(resolveHarnessCommand({ key: 'ENG-1', labels: [] }, { id: 'A' }), '/auto --group A');
  } finally {
    if (previous !== undefined) process.env.HARNESS_COMMAND_TEMPLATE = previous;
  }
});

test('resolveHarnessCommand honours a HARNESS_COMMAND_TEMPLATE override', () => {
  const previous = process.env.HARNESS_COMMAND_TEMPLATE;
  process.env.HARNESS_COMMAND_TEMPLATE = '/improve --group {{group}} --issue {{issue}}';
  try {
    assert.equal(resolveHarnessCommand({ key: 'ENG-2', labels: [] }, { id: 'B' }), '/improve --group B --issue ENG-2');
  } finally {
    if (previous === undefined) delete process.env.HARNESS_COMMAND_TEMPLATE;
    else process.env.HARNESS_COMMAND_TEMPLATE = previous;
  }
});

test('resolveHarnessCommand prefers a per-issue mode-<command> label over the template', () => {
  const command = resolveHarnessCommand({ key: 'ENG-3', labels: ['mode-vibe'] }, { id: 'C' });
  assert.equal(command, '/vibe --group C');
});

test('resolveHarnessCommand accepts mode:<command> as well as mode-<command>', () => {
  const command = resolveHarnessCommand({ key: 'ENG-4', labels: ['mode:improve'] }, { id: 'D' });
  assert.equal(command, '/improve --group D');
});

test('buildHarnessPrompt interpolates every placeholder including stories', () => {
  const prompt = buildHarnessPrompt({ key: 'ENG-5', url: 'https://tracker.test/ENG-5', labels: [] }, { id: 'E', stories: ['E1-S1', 'E1-S2'] });
  assert.match(prompt, /tracker group E/);
  assert.match(prompt, /Stories: E1-S1, E1-S2/);
  assert.match(prompt, /"group": "E"/);
});

test('buildFeaturePrompt frames the change request as untrusted data and normalizes quotes in the title', () => {
  const prompt = buildFeaturePrompt({ key: 'ENG-6', title: 'Support "dark mode"', description: 'Users want it.' });
  assert.match(prompt, /Title: Support 'dark mode'/);
  assert.match(prompt, /BEGIN REQUEST >>>/);
  assert.match(prompt, /Users want it\./);
});

test('groupFromIssue parses bullet-prefixed Group/Stories lines', () => {
  const group = groupFromIssue({ key: 'ENG-7', description: '## Harness Group\n\n- Group: A\n- Stories: E1-S1, E1-S2\n' });
  assert.equal(group.id, 'A');
  assert.deepEqual(group.stories, ['E1-S1', 'E1-S2']);
});

test('groupFromIssue parses bare (non-bulleted) Group/Stories lines', () => {
  const group = groupFromIssue({ key: 'ENG-8', description: 'Group: B\nStories: E2-S1\n' });
  assert.equal(group.id, 'B');
  assert.deepEqual(group.stories, ['E2-S1']);
});

test('groupFromIssue falls back to the issue key and empty stories when the description has neither field', () => {
  const group = groupFromIssue({ key: 'ENG-9', description: 'No structured fields here.' });
  assert.equal(group.id, 'ENG-9');
  assert.deepEqual(group.stories, []);
});
