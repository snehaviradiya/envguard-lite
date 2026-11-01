import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv, ValidationError } from '../src/validate.js';


// Enum validation tests
test('validateEnv: enum valid value passes', () => {
  const schema = { MODE: { type: 'string', enum: ['development', 'production'], required: true } };
  const env = makeEnv({ MODE: 'development' });
  const cfg = validateEnv(schema, env);
  assert.equal(cfg.MODE, 'development');
});

test('validateEnv: enum invalid value throws', () => {
  const schema = { MODE: { type: 'string', enum: ['development', 'production'], required: true } };
  const env = makeEnv({ MODE: 'staging' });
  assert.throws(() => validateEnv(schema, env), err =>
    err instanceof ValidationError && err.message.includes('must be one of')
  );
});

// URL validation tests
test('validateEnv: valid URL passes', () => {
  const schema = { API_URL: { type: 'url', required: true } };
  const env = makeEnv({ API_URL: 'https://example.com/api' });
  const cfg = validateEnv(schema, env);
  assert.equal(cfg.API_URL, 'https://example.com/api');
});

test('validateEnv: invalid URL throws', () => {
  const schema = { API_URL: { type: 'url', required: true } };
  const env = makeEnv({ API_URL: 'not-a-url' });
  assert.throws(() => validateEnv(schema, env), err =>
    err instanceof ValidationError && err.message.includes('must be a valid URL')
  );
});

// Pattern validation tests
test('validateEnv: pattern matches passes', () => {
  const schema = { APP_ID: { type: 'string', pattern: /^[a-z0-9-]+$/ } };
  const env = makeEnv({ APP_ID: 'my-app-123' });
  const cfg = validateEnv(schema, env);
  assert.equal(cfg.APP_ID, 'my-app-123');
});

test('validateEnv: pattern mismatch throws', () => {
  const schema = { APP_ID: { type: 'string', pattern: /^[a-z0-9-]+$/ } };
  const env = makeEnv({ APP_ID: 'Invalid_ID!' });
  assert.throws(() => validateEnv(schema, env), err =>
    err instanceof ValidationError && err.message.includes('does not match required pattern')
  );
});

// Multiple errors collection test
test('validateEnv: multiple errors are aggregated', () => {
  const schema = {
    MODE: { type: 'string', enum: ['dev', 'prod'], required: true },
    API_URL: { type: 'url', required: true },
    PORT: { type: 'number', required: true },
  };
  const env = makeEnv({ MODE: 'test', API_URL: 'bad', PORT: 'NaN' });
  try {
    validateEnv(schema, env);
    assert.fail('Expected ValidationError');
  } catch (err) {
    assert.ok(err instanceof ValidationError);
    // Should contain three messages
    assert.equal(err.messages.length, 3);
  }
});

// Defaults interacting with new rules
test('validateEnv: default respects enum and pattern', () => {
  const schema = {
    MODE: { type: 'string', enum: ['dev', 'prod'], default: 'dev' },
    API_URL: { type: 'url', default: 'https://example.com' },
    TAG: { type: 'string', pattern: /^v\d+$/, default: 'v1' },
  };
  const env = makeEnv({});
  const cfg = validateEnv(schema, env);
  assert.equal(cfg.MODE, 'dev');
  assert.equal(cfg.API_URL, 'https://example.com');
  assert.equal(cfg.TAG, 'v1');
});

function makeEnv(vars) {
  return { ...vars };
}

test('validateEnv: valid required string', () => {
  const schema = { APP_NAME: { type: 'string', required: true } };
  const env = makeEnv({ APP_NAME: 'my-app' });
  const cfg = validateEnv(schema, env);
  assert.equal(cfg.APP_NAME, 'my-app');
});

test('validateEnv: missing required variable throws ValidationError', () => {
  const schema = { DB_URL: { type: 'string', required: true } };
  const env = makeEnv({});
  assert.throws(() => validateEnv(schema, env), (err) => err instanceof ValidationError && err.message.includes('Missing required environment variable'));
});

test('validateEnv: default value applied when variable missing', () => {
  const schema = { PORT: { type: 'number', default: 3000 } };
  const env = makeEnv({});
  const cfg = validateEnv(schema, env);
  assert.equal(cfg.PORT, 3000);
});

test('validateEnv: valid number parsing', () => {
  const schema = { PORT: { type: 'number', required: true } };
  const env = makeEnv({ PORT: '8080' });
  const cfg = validateEnv(schema, env);
  assert.equal(cfg.PORT, 8080);
});

test('validateEnv: invalid number throws ValidationError', () => {
  const schema = { PORT: { type: 'number', required: true } };
  const env = makeEnv({ PORT: 'not-a-number' });
  assert.throws(() => validateEnv(schema, env), (err) => err instanceof ValidationError && err.message.includes('must be a valid number'));
});

test('validateEnv: accepted boolean true/false strings', () => {
  const schema = { DEBUG: { type: 'boolean', required: true } };
  const envTrue = makeEnv({ DEBUG: 'true' });
  const envFalse = makeEnv({ DEBUG: 'false' });
  const cfgTrue = validateEnv(schema, envTrue);
  const cfgFalse = validateEnv(schema, envFalse);
  assert.equal(cfgTrue.DEBUG, true);
  assert.equal(cfgFalse.DEBUG, false);
});

test('validateEnv: invalid boolean throws ValidationError', () => {
  const schema = { DEBUG: { type: 'boolean', required: true } };
  const env = makeEnv({ DEBUG: 'yes' });
  assert.throws(() => validateEnv(schema, env), (err) => err instanceof ValidationError && err.message.includes('must be \'true\' or \'false\''));
});

test('validateEnv: custom environment object works', () => {
  const schema = { APP_NAME: { type: 'string', required: true } };
  const customEnv = { APP_NAME: 'custom-app' };
  const cfg = validateEnv(schema, customEnv);
  assert.equal(cfg.APP_NAME, 'custom-app');
});

// Multiple configuration errors – ensure first missing required triggers
test('validateEnv: multiple missing required variables throws first error', () => {
  const schema = {
    USER: { type: 'string', required: true },
    PASS: { type: 'string', required: true },
  };
  const env = makeEnv({});
  try {
    validateEnv(schema, env);
    assert.fail('Expected ValidationError');
  } catch (err) {
    assert.ok(err instanceof ValidationError);
    assert.ok(err.message.includes('Missing required environment variable'));
  }
});
