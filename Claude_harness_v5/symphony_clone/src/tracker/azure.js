'use strict';

// Azure DevOps (Boards) REST adapter. Same duck-typed contract as Linear/Jira.
// Azure has no GraphQL and work items are addressed by numeric id rather than a
// human key; "labels" are semicolon-separated tags, and "state" is the
// System.State field. Listing is two-phase — a WIQL query for candidate ids,
// then a work-item batch fetch — because blocker relations only carry a URL, so
// resolving their state needs a second batch fetch.

const { restRequest, basicAuth, unique } = require('./http');

const API_VERSION = '7.1';
const COMMENTS_API_VERSION = '7.1-preview.3';
const BLOCKED_BY_REL = 'System.LinkTypes.Dependency-Reverse'; // predecessor blocks this item

class AzureDevOpsTracker {
  constructor(config, fetchImpl = globalThis.fetch) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async listCandidates() {
    const ids = await this.queryCandidateIds();
    if (ids.length === 0) return [];

    const items = await this.getWorkItems(ids, true);
    const blockerStates = await this.resolveBlockerStates(items);
    return items.map((item) => normalizeAzureItem(item, this.config.azure, blockerStates));
  }

  async queryCandidateIds() {
    const states = [this.config.tracker.readyState, this.config.tracker.runningState];
    const stateList = states.map((state) => `'${String(state).replace(/'/g, "''")}'`).join(', ');
    const query = `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.State] IN (${stateList})`;
    const data = await this.request('POST', `/_apis/wit/wiql?api-version=${API_VERSION}`, { query });
    return (data.workItems || []).map((item) => item.id);
  }

  async getWorkItems(ids, withRelations) {
    const detail = withRelations ? '&$expand=relations' : '&fields=System.State';
    const data = await this.request('GET', `/_apis/wit/workitems?ids=${ids.join(',')}${detail}&api-version=${API_VERSION}`);
    return data.value || [];
  }

  async resolveBlockerStates(items) {
    const blockerIds = unique(items.flatMap((item) => blockerIdsFromRelations(item.relations || [])));
    const stateById = new Map();
    if (blockerIds.length === 0) return stateById;

    const blockers = await this.getWorkItems(blockerIds, false);
    for (const blocker of blockers) stateById.set(blocker.id, blocker.fields && blocker.fields['System.State']);
    return stateById;
  }

  async moveIssue(issueId, stateName, fallbackNames = []) {
    const candidateNames = unique([stateName, ...fallbackNames]);
    let lastError = null;

    for (const name of candidateNames) {
      try {
        await this.patchState(issueId, name);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(`Azure DevOps could not set state for work item ${issueId} (tried: ${candidateNames.join(', ')}): ${lastError && lastError.message}`);
  }

  async patchState(issueId, stateName) {
    await this.request(
      'PATCH',
      `/_apis/wit/workitems/${issueId}?api-version=${API_VERSION}`,
      [{ op: 'add', path: '/fields/System.State', value: stateName }],
      'application/json-patch+json'
    );
  }

  async addComment(issueId, body) {
    await this.request('POST', `/_apis/wit/workItems/${issueId}/comments?api-version=${COMMENTS_API_VERSION}`, { text: body });
  }

  request(method, urlPath, body, contentType = 'application/json') {
    return restRequest(this.fetchImpl, `${this.config.azure.baseUrl}${urlPath}`, {
      method,
      body,
      contentType,
      headers: { Authorization: `Basic ${basicAuth('', this.config.azure.pat)}` },
      errorLabel: `Azure DevOps ${method} ${urlPath}`
    });
  }
}

function normalizeAzureItem(item, azure, blockerStates) {
  const fields = item.fields || {};
  const id = item.id;
  return {
    id,
    key: String(id),
    title: fields['System.Title'] || '',
    description: htmlToText(fields['System.Description'] || ''),
    url: `${azure.orgUrl}/${encodeURIComponent(azure.project)}/_workitems/edit/${id}`,
    branchName: null,
    priority: fields['Microsoft.VSTS.Common.Priority'] != null ? fields['Microsoft.VSTS.Common.Priority'] : null,
    state: fields['System.State'],
    labels: parseTags(fields['System.Tags']),
    blockedBy: blockerIdsFromRelations(item.relations || []).map((blockerId) => ({
      id: blockerId,
      key: String(blockerId),
      state: blockerStates.get(blockerId) || null
    }))
  };
}

function blockerIdsFromRelations(relations) {
  return relations
    .filter((relation) => relation.rel === BLOCKED_BY_REL)
    .map((relation) => workItemIdFromUrl(relation.url))
    .filter((id) => id !== null);
}

function workItemIdFromUrl(url) {
  const match = /\/workItems\/(\d+)/i.exec(url || '');
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseTags(tags) {
  if (!tags) return [];
  return String(tags).split(';').map((tag) => tag.trim()).filter(Boolean);
}

function htmlToText(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { AzureDevOpsTracker, normalizeAzureItem };
