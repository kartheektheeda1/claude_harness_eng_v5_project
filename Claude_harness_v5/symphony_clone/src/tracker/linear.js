'use strict';

const { normalize, unique } = require('./http');

// Linear's API is GraphQL, so unlike the Jira/Azure REST adapters this class
// owns its own transport (this.graphql) instead of going through ./http.js.
// Public shape (listCandidates / moveIssue / addComment) matches the other two
// adapters so the scheduler can treat all three trackers identically.
class LinearTracker {
  constructor(config, fetchImpl = globalThis.fetch) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async listCandidates() {
    const query = `
      query HarnessCandidates($projectSlug: String!, $stateNames: [String!]!) {
        issues(
          first: 50,
          filter: {
            project: { slugId: { eq: $projectSlug } },
            state: { name: { in: $stateNames } }
          }
        ) {
          nodes {
            id
            identifier
            title
            description
            url
            branchName
            priority
            state { name }
            labels { nodes { name } }
            relations {
              nodes {
                type
                relatedIssue {
                  id
                  identifier
                  state { name }
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.graphql(query, {
      projectSlug: this.config.linear.projectSlug,
      stateNames: [this.config.tracker.readyState, this.config.tracker.runningState]
    });

    return data.issues.nodes.map(normalizeLinearIssue);
  }

  async moveIssue(issueId, stateName, fallbackNames = []) {
    const stateId = await this.findStateId(stateName, fallbackNames);
    const mutation = `
      mutation HarnessMoveIssue($issueId: String!, $stateId: String!) {
        issueUpdate(id: $issueId, input: { stateId: $stateId }) {
          success
        }
      }
    `;
    await this.graphql(mutation, { issueId, stateId });
  }

  async addComment(issueId, body) {
    const mutation = `
      mutation HarnessComment($issueId: String!, $body: String!) {
        commentCreate(input: { issueId: $issueId, body: $body }) {
          success
        }
      }
    `;
    await this.graphql(mutation, { issueId, body });
  }

  async findStateId(stateName, fallbackNames = []) {
    const states = await this.listWorkflowStates();
    const candidateNames = unique([stateName, ...fallbackNames]);
    const wanted = candidateNames.map(normalize);
    const match = states.find((state) => wanted.includes(normalize(state.name)));

    if (!match) {
      const available = states.map((state) => state.name).sort().join(', ');
      throw new Error(`Linear workflow state not found: ${stateName} (tried: ${candidateNames.join(', ')}; available: ${available})`);
    }
    return match.id;
  }

  async listWorkflowStates() {
    const query = `
      query HarnessWorkflowStates {
        workflowStates(first: 100) {
          nodes { id name }
        }
      }
    `;
    const data = await this.graphql(query, {});
    return data.workflowStates.nodes;
  }

  async graphql(query, variables) {
    const response = await this.fetchImpl(this.config.linear.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: this.config.linear.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Linear GraphQL request failed with HTTP ${response.status}: ${body}`);
    }

    const payload = await response.json();
    if (payload.errors && payload.errors.length > 0) {
      throw new Error(`Linear GraphQL error: ${payload.errors.map((error) => error.message).join('; ')}`);
    }

    return payload.data;
  }
}

// Only 'blocked_by' relations count as blockers: from this issue's perspective, a
// 'blocks' relation means the RELATED issue is the one being blocked, and
// including it here would incorrectly hold this issue hostage to its own
// dependents.
function normalizeLinearIssue(issue) {
  const relationNodes = (issue.relations && issue.relations.nodes) || [];
  return {
    id: issue.id,
    key: issue.identifier,
    title: issue.title,
    description: issue.description || '',
    url: issue.url || null,
    branchName: issue.branchName || null,
    priority: issue.priority || null,
    state: issue.state && issue.state.name,
    labels: ((issue.labels && issue.labels.nodes) || []).map((label) => label.name),
    blockedBy: relationNodes
      .filter((relation) => relation.type === 'blocked_by')
      .map((relation) => ({
        id: relation.relatedIssue && relation.relatedIssue.id,
        key: relation.relatedIssue && relation.relatedIssue.identifier,
        state: relation.relatedIssue && relation.relatedIssue.state && relation.relatedIssue.state.name
      }))
  };
}

module.exports = { LinearTracker, normalizeLinearIssue, normalize, unique };
