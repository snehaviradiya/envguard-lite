import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv, ValidationError } from '../src/validate.js';

// Helper to create env objects
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
