'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Every event is appended as one JSON line (timestamp, level, event name, plus
// whatever context the caller passes) and mirrored to stdout for `docker compose
// logs`. The file is the durable record; stdout is just for tailing live.
class JsonlLogger {
  constructor({ logRoot }) {
    this.logRoot = logRoot;
    this.logPath = path.join(logRoot, 'orchestrator.jsonl');
    fs.mkdirSync(logRoot, { recursive: true });
  }

  info(event, data = {}) {
    this.append('info', event, data);
  }

  warn(event, data = {}) {
    this.append('warn', event, data);
  }

  error(event, data = {}) {
    this.append('error', event, data);
  }

  append(level, event, data) {
    const record = { ts: new Date().toISOString(), level, event, ...data };
    fs.appendFileSync(this.logPath, `${JSON.stringify(record)}\n`);
    const issueSuffix = data.issueKey ? ` issue=${data.issueKey}` : '';
    console.log(`${record.ts} ${level} ${event}${issueSuffix}`);
  }
}

function createLogger(config) {
  return new JsonlLogger({ logRoot: config.logRoot });
}

module.exports = { JsonlLogger, createLogger };
