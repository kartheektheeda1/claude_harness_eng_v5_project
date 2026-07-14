'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAzureItem } = require('./azure');

test('normalizeAzureItem strips HTML from the description', () => {
  const item = {
    id: 42,
    fields: {
      'System.Title': 'Ship the widget',
      'System.Description': '<div>Line one</div><p>Line two &amp; more</p>',
      'System.State': 'Ready for Agent',
      'System.Tags': 'agent-ready; group-a',
      'Microsoft.VSTS.Common.Priority': 2
    },
    relations: []
  };
  const azure = { orgUrl: 'https://dev.azure.com/acme', project: 'Widgets' };
  const normalized = normalizeAzureItem(item, azure, new Map());

  assert.equal(normalized.key, '42');
  assert.equal(normalized.description, 'Line one\nLine two & more');
  assert.deepEqual(normalized.labels, ['agent-ready', 'group-a']);
  assert.equal(normalized.url, 'https://dev.azure.com/acme/Widgets/_workitems/edit/42');
});

test('normalizeAzureItem resolves blocker ids to their fetched state', () => {
  const item = {
    id: 7,
    fields: { 'System.Title': 'x', 'System.State': 'In Progress' },
    relations: [
      { rel: 'System.LinkTypes.Dependency-Reverse', url: 'https://dev.azure.com/acme/_apis/wit/workItems/5' },
      { rel: 'System.LinkTypes.Dependency-Forward', url: 'https://dev.azure.com/acme/_apis/wit/workItems/9' }
    ]
  };
  const blockerStates = new Map([[5, 'Done']]);
  const normalized = normalizeAzureItem(item, { orgUrl: 'https://dev.azure.com/acme', project: 'Widgets' }, blockerStates);

  assert.equal(normalized.blockedBy.length, 1);
  assert.equal(normalized.blockedBy[0].id, 5);
  assert.equal(normalized.blockedBy[0].state, 'Done');
});

test('normalizeAzureItem defaults tags and priority when absent', () => {
  const item = { id: 1, fields: { 'System.Title': 'x', 'System.State': 'Todo' }, relations: [] };
  const normalized = normalizeAzureItem(item, { orgUrl: 'https://dev.azure.com/acme', project: 'Widgets' }, new Map());
  assert.deepEqual(normalized.labels, []);
  assert.equal(normalized.priority, null);
});
