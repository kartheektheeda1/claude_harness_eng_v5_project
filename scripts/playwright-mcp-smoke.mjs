import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4177;
const URL = `http://127.0.0.1:${PORT}`;
const VITE = path.join(ROOT, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js');
const MCP = path.join(ROOT, 'node_modules', '@playwright', 'mcp', 'cli.js');

function start(command, args, options = {}) {
  return spawn(command, args, {
    cwd: options.cwd || ROOT,
    windowsHide: true,
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...options.env },
  });
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Vite did not become ready at ${url} within ${timeoutMs}ms.`);
}

function textContent(result) {
  return (result.content || [])
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n');
}

const vite = start(
  process.execPath,
  [VITE, '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
  { cwd: path.join(ROOT, 'frontend') },
);
let viteErrors = '';
vite.stderr.on('data', (chunk) => { viteErrors += String(chunk); });

let client;
try {
  await waitForServer(URL);

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [MCP, '--headless', '--browser', 'chromium', '--isolated'],
    cwd: ROOT,
    stderr: 'pipe',
  });
  client = new Client({ name: 'claimflow-evaluator', version: '1.0.0' });
  await client.connect(transport);

  const available = await client.listTools();
  const names = new Set(available.tools.map((tool) => tool.name));
  for (const required of ['browser_navigate', 'browser_snapshot']) {
    if (!names.has(required)) throw new Error(`Playwright MCP is missing required tool: ${required}`);
  }

  const navigation = await client.callTool({ name: 'browser_navigate', arguments: { url: URL } });
  if (navigation.isError) throw new Error(`MCP navigation failed: ${textContent(navigation)}`);

  const snapshot = await client.callTool({ name: 'browser_snapshot', arguments: {} });
  if (snapshot.isError) throw new Error(`MCP accessibility snapshot failed: ${textContent(snapshot)}`);
  const accessibilityTree = textContent(snapshot);
  if (!/ClaimFlow/i.test(accessibilityTree) || !/clearer path/i.test(accessibilityTree)) {
    throw new Error('MCP snapshot did not contain the expected ClaimFlow landing-page landmarks.');
  }

  console.log('Playwright MCP navigation and accessibility snapshot passed.');
} catch (error) {
  if (viteErrors.trim()) process.stderr.write(viteErrors);
  throw error;
} finally {
  if (client) await client.close().catch(() => {});
  vite.kill();
}
