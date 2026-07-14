'use strict';

// Linear speaks GraphQL and keeps its own client (see ./linear.js). Jira and Azure
// DevOps are both plain token-authenticated REST, so their request plumbing —
// auth header, ok-check, 204/JSON handling, and bounding how much of an error
// body gets folded into a thrown Error (these surface in logs and tracker
// comments) — is centralized here instead of duplicated per adapter.

const MAX_ERROR_BODY_CHARS = 500;

async function restRequest(fetchImpl, url, { method, headers = {}, body, contentType = 'application/json', errorLabel = 'request' }) {
  const requestHeaders = { Accept: 'application/json', ...headers };
  const init = { method, headers: requestHeaders };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = contentType;
    init.body = JSON.stringify(body);
  }

  const response = await fetchImpl(url, init);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${errorLabel} failed with HTTP ${response.status}: ${truncate(text)}`);
  }
  if (response.status === 204) return {};
  return response.json().catch(() => ({}));
}

function basicAuth(user, token) {
  return Buffer.from(`${user}:${token}`).toString('base64');
}

function truncate(text, max = MAX_ERROR_BODY_CHARS) {
  const value = text == null ? '' : String(text);
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

// Preserves falsy-but-meaningful values (0, '') — only null/undefined are
// dropped — so a numeric work-item id of 0 would still survive deduping.
function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined))];
}

module.exports = { restRequest, basicAuth, truncate, normalize, unique };
