import { spawn } from 'node:child_process';
import process from 'node:process';

const windows = process.platform === 'win32';
const children = [
  spawn(windows ? 'mvnw.cmd' : './mvnw', ['spring-boot:run', '-Dspring-boot.run.profiles=demo'], {
    cwd: process.cwd(), stdio: 'inherit', shell: windows,
  }),
  spawn(windows ? 'npm.cmd' : 'npm', ['--prefix', 'frontend', 'run', 'dev', '--', '--host', '127.0.0.1'], {
    cwd: process.cwd(), stdio: 'inherit', shell: windows,
  }),
];

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill('SIGTERM');
  setTimeout(() => process.exit(exitCode), 250).unref();
}
for (const child of children) {
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { if (!stopping && code !== 0) stop(code ?? 1); });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
console.log('ClaimFlow demo starting: UI http://127.0.0.1:5173, API http://127.0.0.1:8080');
