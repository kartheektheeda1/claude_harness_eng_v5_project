'use strict';

const http = require('node:http');

// Enabled only when STATUS_PORT > 0. Three routes: JSON health check, raw
// state.json snapshot, and a plain HTML table for humans glancing at progress.
function startStatusServer({ port, stateStore, logger }) {
  const server = http.createServer(createRequestHandler({ stateStore }));

  return new Promise((resolve) => {
    server.listen(port, () => {
      if (logger) logger.info('status_server_started', { port: server.address().port });
      resolve(server);
    });
  });
}

function createRequestHandler({ stateStore }) {
  return (request, response) => {
    if (request.url === '/health') return sendJson(response, 200, { ok: true });
    if (request.url === '/state') return sendJson(response, 200, stateStore.snapshot());
    if (request.url === '/') return sendHtml(response, 200, renderDashboard(stateStore.snapshot()));
    return sendJson(response, 404, { error: 'not_found' });
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function sendHtml(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(body);
}

function renderDashboard(snapshot) {
  const runs = Object.values(snapshot.runs || {});
  const rows = runs.map(renderRow).join('');
  return `<!doctype html>
<html>
<head><title>symphony_clone status</title><style>body{font-family:system-ui,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head>
<body><h1>symphony_clone status</h1><table><thead><tr><th>Issue</th><th>Status</th><th>Attempt</th><th>Next retry</th><th>PR</th><th>Last error</th></tr></thead><tbody>${rows}</tbody></table></body>
</html>`;
}

function renderRow(run) {
  const cells = [run.issueKey, run.status, run.attempt, run.nextRetryAt || '', run.prUrl || '', run.lastError || ''];
  return `<tr>${cells.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { startStatusServer, createStatusHandler: createRequestHandler, renderDashboard };
