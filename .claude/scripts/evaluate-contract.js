#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT_DIR = path.join(ROOT, 'specs', 'reviews');
const NODE = process.execPath;
const IS_WINDOWS = process.platform === 'win32';

function command(name, executable, args, options = {}) {
  return { name, executable, args, cwd: options.cwd || ROOT, required: options.required !== false };
}

function harnessTestFiles() {
  const directory = path.join(ROOT, '.claude', 'test');
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((file) => file.endsWith('.test.js')).sort().map((file) => path.join(directory, file));
}

function commands(mode) {
  const npm = IS_WINDOWS ? 'npm.cmd' : 'npm';
  const maven = IS_WINDOWS ? 'mvnw.cmd' : './mvnw';
  const list = [
    command('Harness structure', NODE, [path.join(ROOT, '.claude/scripts/validate-harness.js')]),
    command('Specification contract', NODE, [path.join(ROOT, '.claude/scripts/validate-specs.js')]),
    command('Harness contract tests', NODE, ['--test', ...harnessTestFiles()])
  ];
  if (mode === 'static') return list;
  list.push(
    command('Backend verify', maven, ['--batch-mode', '--no-transfer-progress', 'verify']),
    command('Frontend unit tests', npm, ['test'], { cwd: path.join(ROOT, 'frontend') }),
    command('Frontend production build', npm, ['run', 'build'], { cwd: path.join(ROOT, 'frontend') }),
    command('Symphony syntax checks', npm, ['run', 'check'], { cwd: path.join(ROOT, 'Claude_harness_v5/symphony_clone') }),
    command('Symphony tests', npm, ['test'], { cwd: path.join(ROOT, 'Claude_harness_v5/symphony_clone') })
  );
  if (mode === 'browser') list.push(
    command('Browser acceptance tests', npm, ['run', 'e2e'], { cwd: path.join(ROOT, 'frontend') }),
    command('Playwright MCP accessibility trace', NODE, [path.join(ROOT, 'scripts/playwright-mcp-smoke.mjs')])
  );
  return list;
}

function execute(check) {
  const started = Date.now();
  const needsWindowsWrapper = IS_WINDOWS && /\.(?:cmd|bat)$/i.test(check.executable);
  const executable = needsWindowsWrapper ? (process.env.ComSpec || 'cmd.exe') : check.executable;
  const args = needsWindowsWrapper
    ? ['/d', '/s', '/c', [check.executable, ...check.args].map(quoteWindowsArgument).join(' ')]
    : check.args;
  const result = spawnSync(executable, args, {
    cwd: check.cwd,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15 * 60 * 1000,
    env: { ...process.env, CI: process.env.CI || '1' },
    shell: false
  });
  return {
    name: check.name,
    command: [check.executable, ...check.args].join(' '),
    status: result.status === 0 ? 'PASS' : 'FAIL',
    exitCode: result.status,
    durationMs: Date.now() - started,
    stdout: String(result.stdout || '').slice(-12000),
    stderr: String(result.stderr || result.error?.message || '').slice(-12000)
  };
}

function quoteWindowsArgument(value) {
  const text = String(value);
  return /[\s&|<>^()]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function gitValue(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : null;
}

function writeReport(mode, checks) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const failed = checks.filter((check) => check.status !== 'PASS');
  const report = {
    schemaVersion: 1,
    product: 'ClaimFlow',
    evaluator: 'claimflow-evaluator-contract',
    mode,
    generatedAt: new Date().toISOString(),
    commit: gitValue(['rev-parse', 'HEAD']),
    branch: gitValue(['branch', '--show-current']),
    harnessFoundation: JSON.parse(fs.readFileSync(path.join(ROOT, 'harness-lock.json'), 'utf8')),
    verdict: failed.length ? 'BLOCKED' : 'PASS',
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks
  };
  const jsonPath = path.join(REPORT_DIR, 'evaluator-report.json');
  const markdownPath = path.join(REPORT_DIR, 'evaluator-report.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  const rows = checks.map((check) => `| ${check.name} | ${check.status} | ${check.exitCode ?? 'n/a'} | ${check.durationMs} |`).join('\n');
  fs.writeFileSync(markdownPath, [
    '# ClaimFlow Evaluator Report', '',
    `- Verdict: **${report.verdict}**`,
    `- Mode: \`${mode}\``,
    `- Commit: \`${report.commit || 'unavailable'}\``,
    `- Generated: \`${report.generatedAt}\``, '',
    '| Check | Status | Exit | Duration ms |',
    '|---|---:|---:|---:|', rows, '',
    failed.length ? 'The evaluator blocks completion until every failed check is resolved.' : 'All selected independent checks passed.', ''
  ].join('\n'));
  return report;
}

function main() {
  const mode = process.argv.includes('--browser') ? 'browser' : process.argv.includes('--all') ? 'all' : 'static';
  const selected = commands(mode);
  const checks = [];
  for (const check of selected) {
    process.stdout.write(`evaluate: ${check.name}\n`);
    checks.push(execute(check));
  }
  const report = writeReport(mode, checks);
  process.stdout.write(`Evaluator contract: ${report.verdict} (${report.summary.passed}/${report.summary.total} checks passed)\n`);
  process.exitCode = report.verdict === 'PASS' ? 0 : 1;
}

if (require.main === module) main();

module.exports = { commands, execute, writeReport };
