#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateSpecs } = require('./validate-specs');

const REQUIRED_INSTRUCTIONS = [
  'CLAUDE.md',
  'src/CLAUDE.md',
  'src/test/CLAUDE.md',
  'frontend/CLAUDE.md',
  'Claude_harness_v5/symphony_clone/CLAUDE.md'
];
const REQUIRED_HOOKS = ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop'];
const REQUIRED_PROJECT_SKILLS = [
  'fraud-rule-evaluator', 'payout-calculator',
  'document-checklist-generator', 'state-machine-validator'
];
const REQUIRED_CAPSTONE_FILES = [
  'harness-lock.json', 'plugin.json', 'specs/app_spec.md',
  'docs/business-case.md', 'docs/architecture.md', 'docs/tdd.md',
  'docs/knowledge-deposits.md'
];

function parseJson(root, relativePath, errors) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  } catch (error) {
    errors.push(`${relativePath}: ${error.code === 'ENOENT' ? 'missing' : `invalid JSON (${error.message})`}`);
    return null;
  }
}

function markdownFiles(root, relativeDir) {
  const directory = path.join(root, relativeDir);
  try {
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => path.join(relativeDir, entry.name).replaceAll('\\', '/'))
      .sort();
  } catch (_) {
    return [];
  }
}

function skillFiles(root) {
  const directory = path.join(root, '.claude', 'skills');
  try {
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `.claude/skills/${entry.name}/SKILL.md`)
      .filter((file) => fs.existsSync(path.join(root, file)))
      .sort();
  } catch (_) {
    return [];
  }
}

function frontmatter(text) {
  const match = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (item) result[item[1]] = item[2].replace(/^['"]|['"]$/g, '');
  }
  return result;
}

function hookCommands(hooks) {
  const commands = [];
  for (const groups of Object.values(hooks || {})) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      for (const hook of group.hooks || []) if (hook.type === 'command' && hook.command) commands.push(hook.command);
    }
  }
  return commands;
}

function validateHarness(projectRoot = path.resolve(__dirname, '..', '..'), options = {}) {
  const errors = [];
  const warnings = [];
  const exists = (file) => fs.existsSync(path.join(projectRoot, file));

  for (const file of REQUIRED_INSTRUCTIONS) if (!exists(file)) errors.push(`${file}: missing instruction file`);
  for (const file of REQUIRED_CAPSTONE_FILES) if (!exists(file)) errors.push(`${file}: missing capstone deliverable`);

  const plugin = parseJson(projectRoot, '.claude/.claude-plugin/plugin.json', errors);
  const marketplace = parseJson(projectRoot, '.claude-plugin/marketplace.json', errors);
  const packageJson = parseJson(projectRoot, '.claude/package.json', errors);
  const settings = parseJson(projectRoot, '.claude/settings.json', errors);
  const pluginHooks = parseJson(projectRoot, '.claude/hooks/hooks.json', errors);
  const projectMcp = parseJson(projectRoot, '.mcp.json', errors);
  const pluginMcp = parseJson(projectRoot, '.claude/.mcp.json', errors);

  if (plugin) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(plugin.name || '')) errors.push('plugin.json: name must be lowercase kebab-case');
    if (!/^\d+\.\d+\.\d+$/.test(plugin.version || '')) errors.push('plugin.json: version must be semantic x.y.z');
    if (packageJson && plugin.version !== packageJson.version) errors.push('plugin.json: version must match .claude/package.json');
    if (plugin.mcpServers !== './.mcp.json') errors.push('plugin.json: mcpServers must reference ./.mcp.json');
  }
  if (packageJson && (packageJson.dependencies || packageJson.devDependencies)) errors.push('.claude/package.json: harness must remain zero-dependency');
  if (marketplace) {
    const entries = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
    const entry = entries.find((candidate) => candidate.name === (plugin && plugin.name));
    if (!entry) errors.push('marketplace.json: plugin entry does not match manifest name');
    else if (entry.source !== './.claude') errors.push('marketplace.json: local source must be ./.claude');
  }

  const agents = markdownFiles(projectRoot, '.claude/agents');
  const commands = markdownFiles(projectRoot, '.claude/commands');
  const skills = skillFiles(projectRoot);
  if (agents.length < 10) errors.push(`agents: expected at least 7 foundation and 3 project agents, found ${agents.length}`);
  if (skills.length < 7) errors.push(`skills: expected foundation plus at least 3 project skills, found ${skills.length}`);
  if (commands.length < 3) errors.push(`commands: expected at least 2 project commands plus foundation commands, found ${commands.length}`);
  for (const skill of REQUIRED_PROJECT_SKILLS) if (!skills.includes(`.claude/skills/${skill}/SKILL.md`)) errors.push(`skills: missing project skill ${skill}`);
  if (markdownFiles(projectRoot, '.claude/agents').filter((file) => /claim|fraud|settlement|document|state-machine/.test(file)).length < 3) errors.push('agents: expected at least 3 ClaimFlow-specific agent definitions');
  const hookFileCount = (() => { try { return fs.readdirSync(path.join(projectRoot, '.claude', 'hooks'), { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.js')).length; } catch (_) { return 0; } })();
  if (hookFileCount < 12) errors.push(`hooks: expected at least 12 foundation/project hook scripts, found ${hookFileCount}`);

  for (const file of agents) {
    const agentText = fs.readFileSync(path.join(projectRoot, file), 'utf8');
    const meta = frontmatter(agentText);
    if (!meta) errors.push(`${file}: missing YAML frontmatter`);
    else {
      for (const key of ['name', 'description', 'model']) if (!meta[key]) errors.push(`${file}: frontmatter missing ${key}`);
      if (!/^tools:\s*(?:\S.*)?$/m.test(agentText)) errors.push(`${file}: frontmatter missing tools`);
    }
  }
  for (const file of commands) {
    const meta = frontmatter(fs.readFileSync(path.join(projectRoot, file), 'utf8'));
    if (!meta) errors.push(`${file}: missing YAML frontmatter`);
    else for (const key of ['name', 'description']) if (!meta[key]) errors.push(`${file}: frontmatter missing ${key}`);
  }
  for (const file of skills) {
    const meta = frontmatter(fs.readFileSync(path.join(projectRoot, file), 'utf8'));
    const expectedName = file.split('/').at(-2);
    if (!meta) errors.push(`${file}: missing YAML frontmatter`);
    else {
      if (meta.name !== expectedName) errors.push(`${file}: name must match directory (${expectedName})`);
      if (!meta.description) errors.push(`${file}: frontmatter missing description`);
    }
  }

  for (const [label, hookDocument] of [['settings.json', settings], ['hooks.json', pluginHooks]]) {
    const hooks = hookDocument && hookDocument.hooks;
    for (const event of REQUIRED_HOOKS) if (!hooks || !Array.isArray(hooks[event]) || !hooks[event].length) errors.push(`${label}: missing ${event} hook`);
    for (const command of hookCommands(hooks)) {
      const match = command.match(/(?:\.claude\/|\$\{CLAUDE_PLUGIN_ROOT\}\/)(hooks\/[A-Za-z0-9._/-]+\.js)/);
      if (!match) errors.push(`${label}: hook command does not reference a portable hook script: ${command}`);
      else if (!exists(`.claude/${match[1]}`)) errors.push(`${label}: hook script missing: .claude/${match[1]}`);
      if (/\b[A-Za-z]:\\|\/Users\/|\/home\//.test(command)) errors.push(`${label}: absolute user path in hook command`);
    }
  }

  const mcpConfigs = [['.mcp.json', projectMcp], ['.claude/.mcp.json', pluginMcp]];
  for (const [file, config] of mcpConfigs) {
    const server = config && config.mcpServers && config.mcpServers.claimflow_context;
    if (!server || server.command !== 'node' || !Array.isArray(server.args) || server.args.length !== 1) errors.push(`${file}: invalid claimflow_context server configuration`);
    const playwright = config && config.mcpServers && config.mcpServers.playwright;
    if (!playwright || playwright.command !== 'npx' || !Array.isArray(playwright.args) || !playwright.args.some((arg) => String(arg).includes('@playwright/mcp'))) errors.push(`${file}: Playwright MCP is not active`);
  }
  if (!exists('.claude/mcp/claimflow-context-server.js')) errors.push('.claude/mcp/claimflow-context-server.js: missing MCP server');

  const requiredScripts = [
    '.claude/scripts/validate-harness.js',
    '.claude/scripts/validate-specs.js',
    '.claude/scripts/tdd-cycle.js',
    '.claude/scripts/evaluate-contract.js',
    '.claude/scripts/status.js'
  ];
  for (const file of requiredScripts) if (!exists(file)) errors.push(`${file}: missing executable harness script`);

  const specSentinels = ['project-manifest.json', 'specs/stories/stories.json'];
  const hasAnySpecs = specSentinels.some(exists);
  if (!options.allowMissingSpecs || hasAnySpecs) {
    const specResult = validateSpecs(projectRoot);
    errors.push(...specResult.errors.map((error) => `specs: ${error}`));
    warnings.push(...specResult.warnings.map((warning) => `specs: ${warning}`));
  } else {
    warnings.push('spec contract not present; bootstrap mode skipped validate-specs.js');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts: { agents: agents.length, skills: skills.length, commands: commands.length }
  };
}

function printResult(result) {
  for (const warning of result.warnings) console.warn(`WARN ${warning}`);
  for (const error of result.errors) console.error(`ERROR ${error}`);
  console.log(`Harness contract: ${result.ok ? 'PASS' : 'FAIL'} (${result.counts.agents} agents, ${result.counts.skills} skills, ${result.counts.commands} commands)`);
}

if (require.main === module) {
  const rootIndex = process.argv.indexOf('--root');
  const root = rootIndex >= 0 && process.argv[rootIndex + 1] ? path.resolve(process.argv[rootIndex + 1]) : path.resolve(__dirname, '..', '..');
  const result = validateHarness(root, { allowMissingSpecs: process.argv.includes('--allow-missing-specs') });
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}

module.exports = { frontmatter, validateHarness };
