#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateHarness } = require('./validate-harness');
const { validateSpecs } = require('./validate-specs');

function latestJsonFile(directory) {
  if (!fs.existsSync(directory)) return null;
  const files = fs.readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .map((file) => ({ file, time: fs.statSync(path.join(directory, file)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
  return files[0] ? path.join(directory, files[0].file) : null;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function status(projectRoot = path.resolve(__dirname, '..', '..')) {
  const hasSpecs = fs.existsSync(path.join(projectRoot, 'project-manifest.json')) || fs.existsSync(path.join(projectRoot, 'specs'));
  const harness = validateHarness(projectRoot, { allowMissingSpecs: !hasSpecs });
  const specs = hasSpecs ? validateSpecs(projectRoot) : null;
  const tdd = readJson(path.join(projectRoot, '.claude', 'state', 'tdd-session.json'));
  const latestReportPath = latestJsonFile(path.join(projectRoot, 'specs', 'reviews'));
  const latestReport = latestReportPath ? readJson(latestReportPath) : null;
  return {
    harness: harness.ok ? 'PASS' : 'FAIL',
    harnessErrors: harness.errors,
    specs: specs ? (specs.ok ? 'PASS' : 'FAIL') : 'MISSING',
    specErrors: specs ? specs.errors : [],
    activeTdd: tdd ? { story: tdd.story, acceptanceCriterion: tdd.ac, phase: tdd.phase, test: tdd.test } : null,
    latestEvaluation: latestReportPath ? {
      file: path.relative(projectRoot, latestReportPath).replaceAll('\\', '/'),
      result: latestReport.result || latestReport.status || 'UNKNOWN'
    } : null
  };
}

if (require.main === module) {
  const result = status();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.harness === 'PASS' && result.specs !== 'FAIL' ? 0 : 1;
}

module.exports = { status };
