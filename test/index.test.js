import test from 'node:test';
import assert from 'node:assert/strict';
import defaultExport, { parse, load, config, validateEnv, EnvGuardError, ParseError, LoadError, ValidationError } from '../src/index.js';

test('index: exports all expected named functions and error classes', () => {
  assert.equal(typeof parse, 'function');
  assert.equal(typeof load, 'function');
  assert.equal(typeof config, 'function');
  assert.equal(typeof validateEnv, 'function');
  assert.equal(typeof EnvGuardError, 'function');
  assert.equal(typeof ParseError, 'function');
  assert.equal(typeof LoadError, 'function');
  assert.equal(typeof ValidationError, 'function');
});

test('index: exports default object with matching members', () => {
  assert.equal(defaultExport.parse, parse);
  assert.equal(defaultExport.load, load);
  assert.equal(defaultExport.config, config);
  assert.equal(defaultExport.validateEnv, validateEnv);
  assert.equal(defaultExport.EnvGuardError, EnvGuardError);
  assert.equal(defaultExport.ParseError, ParseError);
  assert.equal(defaultExport.LoadError, LoadError);
  assert.equal(defaultExport.ValidationError, ValidationError);
});
