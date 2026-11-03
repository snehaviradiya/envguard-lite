import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const examplePath = fileURLToPath(new URL('../examples/server.js', import.meta.url));

test('example starts a health endpoint with validated environment settings', async (t) => {
  const child = spawn(process.execPath, [examplePath], {
    env: {
      ...process.env,
      SERVICE_NAME: 'test-service',
      PORT: '0',
      ENABLE_METRICS: 'true',
      NODE_ENV: 'test',
      API_BASE_URL: 'https://api.example.test',
      INSTANCE_ID: 'test-instance'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => child.kill());

  let output = '';
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Example server did not start')), 5000);
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      const match = output.match(/Listening on http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Example exited before starting (${code}): ${output}`));
    });
  });

  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'test-service',
    environment: 'test'
  });
});


test('example reports validation failures without printing invalid values', () => {
  const invalidValue = 'not-a-valid-port';
  const result = spawnSync(process.execPath, [examplePath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SERVICE_NAME: 'test-service',
      PORT: invalidValue,
      API_BASE_URL: 'https://api.example.test',
      INSTANCE_ID: 'test-instance'
    }
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid environment configuration/);
  assert.equal(result.stderr.includes(invalidValue), false);
});
