import test from 'node:test';
import assert from 'node:assert/strict';
import { EnvGuardError, ParseError, LoadError } from '../src/errors.js';

test('EnvGuardError: sets name, message, and default code', () => {
  const err = new EnvGuardError('Something went wrong');
  assert.equal(err instanceof Error, true);
  assert.equal(err instanceof EnvGuardError, true);
  assert.equal(err.name, 'EnvGuardError');
  assert.equal(err.message, 'Something went wrong');
  assert.equal(err.code, 'ERR_ENVGUARD');
});

test('EnvGuardError: allows custom error code', () => {
  const err = new EnvGuardError('Custom code error', 'ERR_CUSTOM');
  assert.equal(err.code, 'ERR_CUSTOM');
});

test('ParseError: formats message with line number', () => {
  const err = new ParseError('Missing = delimiter', {
    line: 12,
    column: 5,
    rawLine: 'INVALID_LINE',
    code: 'ERR_PARSE'
  });

  assert.equal(err instanceof EnvGuardError, true);
  assert.equal(err.name, 'ParseError');
  assert.equal(err.line, 12);
  assert.equal(err.column, 5);
  assert.equal(err.rawLine, 'INVALID_LINE');
  assert.equal(err.code, 'ERR_PARSE');
  assert.equal(err.message, 'Parse error at line 12: Missing = delimiter');
});

test('ParseError: formats message when line number is omitted', () => {
  const err = new ParseError('Invalid syntax');
  assert.equal(err.message, 'Parse error: Invalid syntax');
  assert.equal(err.line, undefined);
});

test('LoadError: encapsulates file path and underlying cause', () => {
  const cause = new Error('ENOENT: no such file or directory');
  const err = new LoadError('File not found', {
    filePath: '/path/to/.env',
    code: 'ENOENT',
    cause
  });

  assert.equal(err instanceof EnvGuardError, true);
  assert.equal(err.name, 'LoadError');
  assert.equal(err.filePath, '/path/to/.env');
  assert.equal(err.code, 'ENOENT');
  assert.equal(err.cause, cause);
  assert.equal(err.message, 'File not found');
});
