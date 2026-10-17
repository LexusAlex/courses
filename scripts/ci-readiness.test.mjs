import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { test } from 'node:test';

// Exercise the actual workflow command against a real HTTP server, without Docker.
const workflow = await readFile(new URL('../.github/workflows/check.yml', import.meta.url), 'utf8');
const probe = workflow.split(/\r?\n/).find((line) => line.trim().startsWith('curl ') && line.includes('/healthz'));
assert.ok(probe, 'The Docker job must check /healthz before requesting site pages.');
const command = probe.trim().split(/\s+/).slice(1);

async function runProbe(handler) {
  const server = createServer(handler);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}/healthz`;
  // Shorten the retry budget for tests; preserve the workflow's retry/error policy.
  const args = command.map((arg) => arg.startsWith('http://') ? url : arg)
    .concat(['--retry', '1', '--retry-delay', '1', '--retry-max-time', '3', '--max-time', '2']);
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(process.platform === 'win32' ? 'curl.exe' : 'curl', args, { timeout: 8000 });
      let stderr = '';
      child.stderr.on('data', (data) => { stderr += data; });
      child.once('error', reject);
      child.once('close', (code) => resolve({ code, stderr }));
    });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('container readiness retries a connection reset during startup', { timeout: 10000 }, async () => {
  let requests = 0;
  const result = await runProbe((request, response) => {
    requests++;
    if (requests === 1) request.socket.resetAndDestroy();
    else response.end('ok');
  });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(requests, 2, 'The probe must retry the reset and receive a successful response.');
});

test('container readiness still fails when the service remains unavailable', { timeout: 10000 }, async () => {
  const result = await runProbe((_request, response) => {
    response.writeHead(503);
    response.end('not ready');
  });
  assert.equal(result.code, 22, result.stderr);
});
