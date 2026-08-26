#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const AC_ID = /^E\d+-S\d+-AC\d+$/;
const STORY_ID = /^E\d+-S\d+$/;
const OFFICIAL_AC_ID = /^AC-\d{2}$/;
const EXPECTED_OFFICIAL_ACS = Array.from({ length: 10 }, (_, index) => `AC-${String(index + 1).padStart(2, '0')}`);

function readJson(filePath, errors) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${path.basename(filePath)}: ${error.code === 'ENOENT' ? 'missing required file' : `invalid JSON (${error.message})`}`);
    return null;
  }
}

function arrayFrom(value, keys) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of keys) if (Array.isArray(value[key])) return value[key];
  return [];
}

function valueOf(object, keys) {
  if (!object || typeof object !== 'object') return undefined;
  for (const key of keys) if (object[key] !== undefined) return object[key];
  return undefined;
}

function collectMatchingStrings(value, pattern, found = new Set()) {
  if (typeof value === 'string') {
    for (const token of value.match(/E\d+-S\d+(?:-AC\d+)?/g) || []) if (pattern.test(token)) found.add(token);
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMatchingStrings(item, pattern, found);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (pattern.test(key)) found.add(key);
      collectMatchingStrings(item, pattern, found);
    }
  }
  return found;
}

function matrixRows(document) {
  const direct = arrayFrom(document, ['requirements', 'rows', 'entries', 'verification', 'matrix']);
  if (direct.length) return direct;
  if (document && typeof document === 'object') {
    return Object.entries(document)
      .filter(([key, value]) => AC_ID.test(key) && value && typeof value === 'object')
      .map(([key, value]) => ({ ac_id: key, ...value }));
  }
  return [];
}

function normalizeCheck(check) {
  if (typeof check === 'string') return { path: check };
  if (!check || typeof check !== 'object') return {};
  return {
    path: valueOf(check, ['path', 'file', 'test_path', 'testPath']),
    command: valueOf(check, ['command', 'runner']),
    status: valueOf(check, ['status', 'state'])
  };
}

function validateSpecs(projectRoot = path.resolve(__dirname, '..', '..')) {
  const errors = [];
  const warnings = [];
  const required = {
    manifest: path.join(projectRoot, 'project-manifest.json'),
    features: path.join(projectRoot, 'specs', 'features.json'),
    stories: path.join(projectRoot, 'specs', 'stories', 'stories.json'),
    traces: path.join(projectRoot, 'specs', 'stories', 'story-traces.json'),
    matrix: path.join(projectRoot, 'specs', 'test_artefacts', 'verification-matrix.json')
  };

  const appSpecPath = path.join(projectRoot, 'specs', 'app_spec.md');
  const requiredFeatureSpecs = [
    'intake_spec.md', 'document-verification_spec.md', 'fraud-screening_spec.md',
    'assessment_spec.md', 'settlement_spec.md', 'reopen_spec.md'
  ];
  let appSpec = '';
  try {
    appSpec = fs.readFileSync(appSpecPath, 'utf8');
  } catch (_) {
    errors.push('specs/app_spec.md: missing root application specification');
  }
  const officialIds = new Set([...appSpec.matchAll(/^### (AC-\d{2})(?:\s+-|\s*$)/gm)].map((match) => match[1]));
  for (const id of EXPECTED_OFFICIAL_ACS) if (!officialIds.has(id)) errors.push(`specs/app_spec.md: missing ${id}`);
  for (const id of officialIds) if (!EXPECTED_OFFICIAL_ACS.includes(id)) warnings.push(`specs/app_spec.md: unexpected official criterion ${id}`);

  const featureSpecText = new Map();
  for (const file of requiredFeatureSpecs) {
    const fullPath = path.join(projectRoot, 'specs', file);
    try {
      featureSpecText.set(file, fs.readFileSync(fullPath, 'utf8'));
    } catch (_) {
      errors.push(`specs/${file}: missing required feature specification`);
    }
  }
  for (const id of EXPECTED_OFFICIAL_ACS) {
    const references = [...featureSpecText.values()].filter((text) => new RegExp(`^### ${id}(?:\\s|$)`, 'm').test(text));
    if (!references.length) errors.push(`feature specs: no explicit Acceptance Criteria section for ${id}`);
  }

  const documents = Object.fromEntries(Object.entries(required).map(([key, file]) => [key, readJson(file, errors)]));
  const contractDir = path.join(projectRoot, 'sprint-contracts');
  let contractFiles = [];
  try {
    contractFiles = fs.readdirSync(contractDir).filter((file) => file.endsWith('.json')).sort();
    if (!contractFiles.length) errors.push('sprint-contracts: at least one JSON contract is required');
  } catch (error) {
    errors.push('sprint-contracts: missing required directory');
  }

  const stories = arrayFrom(documents.stories, ['stories', 'items']);
  if (documents.stories && !stories.length) errors.push('stories.json: expected a non-empty stories array');

  const storyIds = new Set();
  const acceptanceIds = new Set();
  const acceptanceToStory = new Map();
  for (const [storyIndex, story] of stories.entries()) {
    const storyId = valueOf(story, ['id', 'story_id', 'storyId']);
    if (!STORY_ID.test(String(storyId || ''))) {
      errors.push(`stories.json: story ${storyIndex + 1} has invalid stable id ${JSON.stringify(storyId)}`);
      continue;
    }
    if (storyIds.has(storyId)) errors.push(`stories.json: duplicate story id ${storyId}`);
    storyIds.add(storyId);
    const criteria = arrayFrom(story, ['acceptance_criteria', 'acceptanceCriteria', 'criteria']);
    if (criteria.length < 3 || criteria.length > 6) errors.push(`stories.json: ${storyId} must contain 3-6 acceptance criteria (found ${criteria.length})`);
    for (const [criterionIndex, criterion] of criteria.entries()) {
      const acId = valueOf(criterion, ['id', 'ac_id', 'acId']);
      if (!AC_ID.test(String(acId || '')) || !String(acId).startsWith(`${storyId}-AC`)) {
        errors.push(`stories.json: ${storyId} criterion ${criterionIndex + 1} has invalid id ${JSON.stringify(acId)}`);
        continue;
      }
      if (acceptanceIds.has(acId)) errors.push(`stories.json: duplicate acceptance criterion id ${acId}`);
      acceptanceIds.add(acId);
      acceptanceToStory.set(acId, storyId);
      for (const field of ['given', 'when', 'then']) {
        const text = valueOf(criterion, [field, field[0].toUpperCase() + field.slice(1)]);
        if (typeof text !== 'string' || !text.trim()) errors.push(`stories.json: ${acId} is missing non-empty ${field}`);
      }
    }
  }

  const featureStoryIds = collectMatchingStrings(documents.features, STORY_ID);
  for (const storyId of storyIds) if (!featureStoryIds.has(storyId)) errors.push(`features.json: missing reference to ${storyId}`);

  const traceAcceptanceIds = collectMatchingStrings(documents.traces, AC_ID);
  for (const acId of acceptanceIds) if (!traceAcceptanceIds.has(acId)) errors.push(`story-traces.json: missing trace for ${acId}`);

  const rows = matrixRows(documents.matrix);
  if (documents.matrix && !rows.length) errors.push('verification-matrix.json: expected a non-empty requirements/rows array');
  const matrixAcceptanceIds = new Set();
  for (const [rowIndex, row] of rows.entries()) {
    const acId = valueOf(row, ['acceptance_criterion_id', 'acceptanceCriterionId', 'ac_id', 'acId']);
    const inferred = acId || (OFFICIAL_AC_ID.test(String(row.id || '')) ? row.id : undefined);
    if (!OFFICIAL_AC_ID.test(String(inferred || ''))) {
      errors.push(`verification-matrix.json: row ${rowIndex + 1} lacks a valid acceptance criterion id`);
      continue;
    }
    if (!officialIds.has(inferred)) errors.push(`verification-matrix.json: ${inferred} does not exist in specs/app_spec.md`);
    if (matrixAcceptanceIds.has(inferred)) errors.push(`verification-matrix.json: duplicate row for ${inferred}`);
    matrixAcceptanceIds.add(inferred);
    const featureSpec = valueOf(row, ['feature_spec', 'featureSpec']);
    if (!featureSpec || !fs.existsSync(path.join(projectRoot, featureSpec))) errors.push(`verification-matrix.json: ${inferred} requires an existing feature_spec`);
    const layers = valueOf(row, ['required_layers', 'requiredLayers', 'test_layers', 'testLayers', 'layers']);
    if (!Array.isArray(layers) || !layers.length) errors.push(`verification-matrix.json: ${inferred} requires at least one test layer`);
    const checks = arrayFrom(row, ['checks', 'test_files', 'testFiles', 'evidence']);
    if (!checks.length) errors.push(`verification-matrix.json: ${inferred} requires at least one concrete check`);
    for (const checkValue of checks) {
      const check = normalizeCheck(checkValue);
      if (!check.path && !check.command) {
        errors.push(`verification-matrix.json: ${inferred} has a check without path or command`);
        continue;
      }
      if (check.path && !fs.existsSync(path.resolve(projectRoot, check.path))) {
        if (String(check.status || '').toLowerCase() === 'planned') warnings.push(`${inferred}: planned check does not exist yet: ${check.path}`);
        else errors.push(`verification-matrix.json: ${inferred} check path does not exist: ${check.path}`);
      } else if (check.path && !String(check.status || '').toLowerCase().includes('planned')) {
        const checkText = fs.readFileSync(path.resolve(projectRoot, check.path), 'utf8');
        if (!checkText.includes(inferred)) errors.push(`verification-matrix.json: ${inferred} check is not tagged in ${check.path}`);
      }
    }
  }
  for (const acId of EXPECTED_OFFICIAL_ACS) if (!matrixAcceptanceIds.has(acId)) errors.push(`verification-matrix.json: missing row for ${acId}`);

  const contractAcceptanceIds = new Set();
  for (const file of contractFiles) {
    const contract = readJson(path.join(contractDir, file), errors);
    collectMatchingStrings(contract, STORY_ID);
    const contractText = JSON.stringify(contract);
    for (const id of contractText.match(/AC-\d{2}/g) || []) contractAcceptanceIds.add(id);
  }
  for (const id of EXPECTED_OFFICIAL_ACS) if (!contractAcceptanceIds.has(id)) errors.push(`sprint-contracts: no contract covers ${id}`);

  if (documents.manifest) {
    const manifestText = JSON.stringify(documents.manifest);
    if (!/ClaimFlow/i.test(manifestText)) warnings.push('project-manifest.json: project name does not mention ClaimFlow');
    if (!/specs[\\/]features\.json/i.test(manifestText)) warnings.push('project-manifest.json: no explicit specs/features.json pointer found');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts: {
      stories: storyIds.size,
      acceptanceCriteria: officialIds.size,
      matrixRows: matrixAcceptanceIds.size,
      contracts: contractFiles.length
    }
  };
}

function printResult(result) {
  for (const warning of result.warnings) console.warn(`WARN ${warning}`);
  for (const error of result.errors) console.error(`ERROR ${error}`);
  const counts = result.counts;
  console.log(`Spec contract: ${result.ok ? 'PASS' : 'FAIL'} (${counts.stories} stories, ${counts.acceptanceCriteria} ACs, ${counts.matrixRows} matrix rows, ${counts.contracts} contracts)`);
}

if (require.main === module) {
  const rootArg = process.argv.indexOf('--root');
  const projectRoot = rootArg >= 0 && process.argv[rootArg + 1] ? path.resolve(process.argv[rootArg + 1]) : path.resolve(__dirname, '..', '..');
  const result = validateSpecs(projectRoot);
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}

module.exports = { AC_ID, STORY_ID, OFFICIAL_AC_ID, collectMatchingStrings, validateSpecs };
