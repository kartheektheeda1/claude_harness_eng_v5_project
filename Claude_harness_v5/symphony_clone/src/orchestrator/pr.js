'use strict';

const { runCommand } = require('./workspace-manager');

async function maybeCreatePr(workspacePath, issue, group, config) {
  if (!config.github.createPr) return null;

  try {
    const title = `Implement ${issue.key} group ${group.id}`;
    const body = `Automated Claude Harness run for ${issue.key}.\n\nGroup: ${group.id}\nStories: ${group.stories.join(', ') || 'not listed'}`;
    const { stdout } = await runCommand('gh', [
      'pr', 'create', '--title', title, '--body', body, '--base', config.github.baseBranch
    ], { cwd: workspacePath });
    return lastNonEmptyLine(stdout);
  } catch (error) {
    return `PR creation skipped or failed: ${error.message}`;
  }
}

function lastNonEmptyLine(text) {
  return text.trim().split('\n').pop();
}

// Requires the canonical PR URL shape (host/owner/repo/pull/<n>) rather than just
// an http(s) prefix: maybeCreatePr scrapes the last stdout line from `gh`, so a
// stray line from the target repo's own PR-template output must never look
// mergeable.
function isRealPrUrl(prUrl) {
  return typeof prUrl === 'string' && /^https?:\/\/[^/\s]+\/[^/\s]+\/[^/\s]+\/pull\/\d+(?:[/?#].*)?$/.test(prUrl.trim());
}

// Lowercased host/owner/repo from a git remote URL (scp-style, https, or ssh), or
// null if it can't be parsed. Host is included so a pin can't be satisfied by a
// same-owner/repo PR served from an unrelated host.
function repoSlugFromGitUrl(url) {
  const cleaned = String(url || '').trim().replace(/\.git\/?$/, '');
  const match = cleaned.match(/^[^@\s/]+@([^:/\s]+):(.+)$/) // scp: user@host:owner/repo
    || cleaned.match(/^[a-z][\w+.-]*:\/\/(?:[^@/\s]+@)?([^/:\s]+)(?::\d+)?\/(.+)$/i); // scheme://[user@]host[:port]/owner/repo
  if (!match) return null;

  const segments = match[2].split('/').filter(Boolean);
  if (segments.length < 2) return null;
  return `${match[1]}/${segments[segments.length - 2]}/${segments[segments.length - 1]}`.toLowerCase();
}

function repoSlugFromPrUrl(prUrl) {
  const match = String(prUrl || '').match(/^https?:\/\/([^/:\s]+)(?::\d+)?\/([^/\s]+)\/([^/\s]+)\/pull\/\d+/);
  return match ? `${match[1]}/${match[2]}/${match[3]}`.toLowerCase() : null;
}

// Enables GitHub's native auto-merge rather than merging directly: GitHub only
// merges once required status checks pass and branch protections are satisfied,
// so a red build is never landed by this path. Returns {enabled} so the caller
// can fall back to human review if enabling failed for any reason.
async function enableAutoMerge(prUrl, cwd, config) {
  if (!isRealPrUrl(prUrl)) return { enabled: false, reason: 'no PR to merge' };

  const wantSlug = repoSlugFromGitUrl(config.repoUrl);
  const prSlug = repoSlugFromPrUrl(prUrl);
  if (wantSlug && prSlug && prSlug !== wantSlug) {
    return { enabled: false, reason: `PR repo ${prSlug} does not match configured ${wantSlug}` };
  }

  const method = (config.autoMerge && config.autoMerge.method) || 'merge';
  try {
    await runCommand('gh', ['pr', 'merge', '--auto', `--${method}`, '--', prUrl], { cwd });
    return { enabled: true };
  } catch (error) {
    return { enabled: false, reason: error.message };
  }
}

module.exports = { maybeCreatePr, isRealPrUrl, enableAutoMerge, repoSlugFromGitUrl, repoSlugFromPrUrl };
