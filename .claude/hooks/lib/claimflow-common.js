'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function resolveProjectRoot(explicitRoot) {
  const candidates = [
    explicitRoot,
    process.env.CLAUDE_PROJECT_DIR,
    process.env.CLAIMFLOW_PROJECT_DIR,
    process.cwd(),
    path.resolve(__dirname, '..', '..', '..')
  ].filter(Boolean).map((candidate) => path.resolve(candidate));

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'pom.xml')) ||
        fs.existsSync(path.join(candidate, 'CLAUDE.md')) ||
        fs.existsSync(path.join(candidate, 'AGENTS.md'))) {
      return candidate;
    }
  }
  return candidates[0] || process.cwd();
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function appendJsonLine(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

function readHookInput() {
  const text = fs.readFileSync(0, 'utf8').trim();
  return text ? JSON.parse(text) : {};
}

function outputJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function denyPreToolUse(reason) {
  outputJson({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason
    }
  });
}

function blockStop(reason) {
  outputJson({ decision: 'block', reason });
}

function relativeProjectPath(projectRoot, filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  const absolute = path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(projectRoot, filePath);
  const relative = path.relative(projectRoot, absolute).replaceAll('\\', '/');
  if (relative === '..' || relative.startsWith('../') || path.isAbsolute(relative)) return null;
  return relative;
}

function extractToolPaths(input, projectRoot) {
  const toolInput = input.tool_input || input.toolInput || {};
  const raw = [toolInput.file_path, toolInput.filePath, toolInput.path];
  if (Array.isArray(toolInput.files)) {
    for (const file of toolInput.files) raw.push(typeof file === 'string' ? file : file.file_path || file.path);
  }
  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) raw.push(edit.file_path || edit.filePath || edit.path);
  }
  return [...new Set(raw.map((file) => relativeProjectPath(projectRoot, file)).filter(Boolean))];
}

function isTestPath(relativePath) {
  const normalized = String(relativePath || '').replaceAll('\\', '/').toLowerCase();
  return normalized.startsWith('src/test/') ||
    normalized.startsWith('frontend/e2e/') ||
    normalized.includes('/test/') ||
    normalized.includes('/tests/') ||
    /(?:^|\/)[^/]+\.(?:test|spec)\.[^/]+$/.test(normalized);
}

function isProductionPath(relativePath) {
  const normalized = String(relativePath || '').replaceAll('\\', '/');
  if (isTestPath(normalized)) return false;
  return normalized.startsWith('src/main/') ||
    normalized.startsWith('frontend/src/') ||
    normalized.startsWith('Claude_harness_v5/symphony_clone/src/');
}

function statePath(projectRoot, name) {
  return path.join(projectRoot, '.claude', 'state', name);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function logHookError(projectRoot, hook, error) {
  const message = error && error.stack ? error.stack : String(error);
  appendJsonLine(statePath(projectRoot, 'hook-errors.jsonl'), {
    timestamp: new Date().toISOString(),
    hook,
    message
  });
}

module.exports = {
  appendJsonLine,
  blockStop,
  denyPreToolUse,
  extractToolPaths,
  isProductionPath,
  isTestPath,
  logHookError,
  outputJson,
  readHookInput,
  readJson,
  relativeProjectPath,
  resolveProjectRoot,
  sha256,
  statePath,
  writeJsonAtomic
};
