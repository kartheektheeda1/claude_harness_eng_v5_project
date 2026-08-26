import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';

const quick = process.argv.includes('--quick');
const includeE2e = process.argv.includes('--e2e');
const windows = process.platform === 'win32';
const npm = windows ? 'npm.cmd' : 'npm';
const maven = windows ? 'mvnw.cmd' : './mvnw';
const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);

if (nodeMajor !== 22) {
  console.error(
    `ClaimFlow verification requires Node.js 22.x; current runtime is ${process.version}. ` +
    'Run "nvm use 22" and retry the same command.'
  );
  process.exit(1);
}

const checks = [
  ['Claude harness layout', process.execPath, ['.claude/scripts/validate-harness.js']],
  ['Specification traceability', process.execPath, ['.claude/scripts/validate-specs.js']],
  ['Claude harness contracts', npm, ['--prefix', '.claude', 'test']],
];

if (!quick) {
  checks.push(
    ['Symphony static checks', npm, ['--prefix', 'Claude_harness_v5/symphony_clone', 'run', 'check']],
    ['Symphony tests', npm, ['--prefix', 'Claude_harness_v5/symphony_clone', 'test']],
    ['Frontend unit tests', npm, ['--prefix', 'frontend', 'test']],
    ['Frontend production build', npm, ['--prefix', 'frontend', 'run', 'build']],
    ['Backend tests and coverage', maven, ['--batch-mode', '--no-transfer-progress', 'verify']],
  );
}

if (includeE2e) {
  checks.push(['Browser acceptance tests', npm, ['--prefix', 'frontend', 'run', 'e2e']]);
}

if (!existsSync(windows ? 'mvnw.cmd' : 'mvnw') && !quick) {
  console.error(`Missing ${maven}; the Maven Wrapper is required for a reproducible backend check.`);
  process.exit(1);
}

for (const [name, command, args] of checks) {
  console.log(`\n==> ${name}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: windows && /\.(?:cmd|bat)$/i.test(command),
  });

  if (result.error) {
    console.error(`${name} could not start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`${name} failed with exit code ${result.status}.`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\nAll ${checks.length} ClaimFlow checks passed.`);
