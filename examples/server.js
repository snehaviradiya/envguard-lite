// @ts-check

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import envguard from '@snehav27/envguard-lite';

const { load, validateEnv, ValidationError } = envguard;

load({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  silent: true
});

/** @satisfies {import('@snehav27/envguard-lite').ValidationSchema} */
const schema = {
  SERVICE_NAME: { type: 'string', required: true },
  PORT: { type: 'number', default: 3000 },
  ENABLE_METRICS: { type: 'boolean', default: false },
  NODE_ENV: {
    type: 'string',
    enum: ['development', 'production', 'test'],
    default: 'development'
  },
  API_BASE_URL: { type: 'url', required: true },
  INSTANCE_ID: { type: 'string', pattern: /^[a-z0-9][a-z0-9-]{0,31}$/, required: true }
};

try {
  const settings = validateEnv(schema);
  const server = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        status: 'ok',
        service: settings.SERVICE_NAME,
        environment: settings.NODE_ENV
      }));
      return;
    }

    response.writeHead(404);
    response.end('Not found\n');
  });

  server.listen(settings.PORT, '127.0.0.1', () => {
    const address = server.address();
    if (address && typeof address !== 'string') {
      console.log(`Listening on http://127.0.0.1:${address.port}`);
    }
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid environment configuration. Check required values and supported formats.');
  } else {
    console.error('Application startup failed.');
  }
  process.exitCode = 1;
}
