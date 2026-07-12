'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isRealPrUrl, repoSlugFromGitUrl, repoSlugFromPrUrl, enableAutoMerge } = require('./pr');

test('isRealPrUrl accepts the canonical host/owner/repo/pull/n shape', () => {
  assert.equal(isRealPrUrl('https://github.com/acme/widgets/pull/42'), true);
  assert.equal(isRealPrUrl('https://github.com/acme/widgets/pull/42?tab=files'), true);
});

test('isRealPrUrl rejects non-PR URLs and stray output lines', () => {
  assert.equal(isRealPrUrl('https://github.com/acme/widgets'), false);
  assert.equal(isRealPrUrl('Creating pull request...'), false);
  assert.equal(isRealPrUrl(null), false);
});

test('repoSlugFromGitUrl handles scp-style, https, and ssh remotes', () => {
  assert.equal(repoSlugFromGitUrl('git@github.com:acme/widgets.git'), 'github.com/acme/widgets');
  assert.equal(repoSlugFromGitUrl('https://github.com/acme/widgets.git'), 'github.com/acme/widgets');
  assert.equal(repoSlugFromGitUrl('ssh://git@github.com/acme/widgets'), 'github.com/acme/widgets');
});

test('repoSlugFromPrUrl extracts the lowercased slug from a PR URL', () => {
  assert.equal(repoSlugFromPrUrl('https://github.com/Acme/Widgets/pull/9'), 'github.com/acme/widgets');
  assert.equal(repoSlugFromPrUrl('not a url'), null);
});

test('enableAutoMerge refuses to merge a PR from a different repo than configured', async () => {
  const config = { repoUrl: 'git@github.com:acme/widgets.git', autoMerge: { method: 'squash' } };
  const outcome = await enableAutoMerge('https://github.com/other/repo/pull/1', '/tmp', config);
  assert.equal(outcome.enabled, false);
  assert.match(outcome.reason, /does not match configured/);
});

test('enableAutoMerge short-circuits when the PR url is not real', async () => {
  const outcome = await enableAutoMerge('PR creation skipped or failed: gh not installed', '/tmp', { repoUrl: 'git@github.com:acme/widgets.git' });
  assert.equal(outcome.enabled, false);
  assert.equal(outcome.reason, 'no PR to merge');
});
