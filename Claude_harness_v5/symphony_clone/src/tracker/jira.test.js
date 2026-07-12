'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeJiraIssue, adfToText, textToAdf } = require('./jira');

test('adfToText joins paragraph text nodes with newlines between blocks', () => {
  const doc = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Line one' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Line two' }] }
    ]
  };
  assert.equal(adfToText(doc), 'Line one\nLine two');
});

test('adfToText handles hardBreak and returns empty string for null', () => {
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }, { type: 'hardBreak' }, { type: 'text', text: 'b' }] }] };
  assert.equal(adfToText(doc), 'a\nb');
  assert.equal(adfToText(null), '');
  assert.equal(adfToText('plain string'), 'plain string');
});

test('textToAdf wraps each line in its own paragraph node', () => {
  const doc = textToAdf('first\nsecond');
  assert.equal(doc.type, 'doc');
  assert.equal(doc.content.length, 2);
  assert.equal(doc.content[0].content[0].text, 'first');
  assert.equal(doc.content[1].content[0].text, 'second');
});

test('normalizeJiraIssue flattens fields and keeps only inward Blocks links', () => {
  const issue = {
    id: '10001',
    key: 'ENG-5',
    fields: {
      summary: 'Fix the widget',
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'details' }] }] },
      status: { name: 'Ready for Agent' },
      labels: ['agent-ready'],
      priority: { name: 'High' },
      issuelinks: [
        { type: { name: 'Blocks' }, inwardIssue: { id: '9', key: 'ENG-4', fields: { status: { name: 'Done' } } } },
        { type: { name: 'Blocks' }, outwardIssue: { id: '11', key: 'ENG-6' } }
      ]
    }
  };
  const normalized = normalizeJiraIssue(issue, 'https://example.atlassian.net');
  assert.equal(normalized.title, 'Fix the widget');
  assert.equal(normalized.description, 'details');
  assert.equal(normalized.url, 'https://example.atlassian.net/browse/ENG-5');
  assert.equal(normalized.blockedBy.length, 1);
  assert.equal(normalized.blockedBy[0].key, 'ENG-4');
});
