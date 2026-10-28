import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, config } from '../src/loader.js';
import { LoadError, ParseError } from '../src/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

test('load: reads basic env fixture into custom env object', () => {
  const targetEnv = {};
  const filePath = path.join(fixturesDir, '.env.basic');

  const result = load({ path: filePath, processEnv: targetEnv });

  assert.equal(result.parsed.APP_NAME, 'envguard-lite');
  assert.equal(result.parsed.PORT, '8080');
  assert.equal(result.parsed.DEBUG, 'true');
  assert.equal(result.parsed.EMPTY_VAL, '');
  assert.equal(result.parsed.EQUALS_VAL, 'foo=bar=baz');
  assert.equal(result.parsed.EXPORTED_VAR, 'active');

  // Verify targetEnv has the loaded properties
  assert.equal(targetEnv.APP_NAME, 'envguard-lite');
  assert.equal(targetEnv.PORT, '8080');
  assert.deepEqual(result.loaded, result.parsed);
});

test('load: does NOT overwrite existing env values by default (override: false)', () => {
  const targetEnv = {
    PORT: '4000',
    PRE_EXISTING: 'preserved'
  };
  const filePath = path.join(fixturesDir, '.env.basic');

  const result = load({
    path: filePath,
    processEnv: targetEnv,
    override: false
  });

  // Target env retains original value for PORT
  assert.equal(targetEnv.PORT, '4000');
  assert.equal(targetEnv.PRE_EXISTING, 'preserved');
  assert.equal(targetEnv.APP_NAME, 'envguard-lite');

  // result.parsed has what was in the file
  assert.equal(result.parsed.PORT, '8080');
  // result.loaded only reflects newly injected values
  assert.equal('PORT' in result.loaded, false);
  assert.equal(result.loaded.APP_NAME, 'envguard-lite');
});

test('load: DOES overwrite existing env values when override: true', () => {
  const targetEnv = {
    PORT: '4000'
  };
  const filePath = path.join(fixturesDir, '.env.basic');

  const result = load({
    path: filePath,
    processEnv: targetEnv,
    override: true
  });

  // Target env gets overwritten value
  assert.equal(targetEnv.PORT, '8080');
  assert.equal(result.loaded.PORT, '8080');
});

test('load: parses quotes fixture accurately', () => {
  const targetEnv = {};
  const filePath = path.join(fixturesDir, '.env.quotes');

  const { parsed } = load({ path: filePath, processEnv: targetEnv });

  assert.equal(parsed.SINGLE_QUOTED, 'hello world');
  assert.equal(parsed.SINGLE_WITH_ESCAPE, 'literal\\nnewline');
  assert.equal(parsed.DOUBLE_QUOTED, 'hello world');
  assert.equal(parsed.DOUBLE_WITH_NEWLINE, 'hello\nworld');
  assert.equal(parsed.DOUBLE_WITH_TAB, 'col1\tcol2');
  assert.equal(parsed.DOUBLE_WITH_QUOTE, 'escaped "quotes"');
  assert.equal(parsed.BACKTICK_QUOTED, 'backtick value');
  assert.equal(parsed.QUOTED_WITH_COMMENT, 'valid');
});

test('load: parses multiline fixture accurately', () => {
  const targetEnv = {};
  const filePath = path.join(fixturesDir, '.env.multiline');

  const { parsed } = load({ path: filePath, processEnv: targetEnv });

  assert.equal(parsed.MULTI_DOUBLE, 'first line\nsecond line\nthird line');
  assert.equal(parsed.MULTI_SINGLE, 'line 1\nline 2');
  assert.equal(parsed.TRAILING_VAR, 'finished');
});

test('load: parses comments fixture accurately', () => {
  const targetEnv = {};
  const filePath = path.join(fixturesDir, '.env.comments');

  const { parsed } = load({ path: filePath, processEnv: targetEnv });

  assert.equal(parsed.APP_KEY, 'secret_123');
  assert.equal(parsed.COLOR_HEX, '#ff00aa');
  assert.equal(parsed.URL_WITH_HASH, 'https://example.com/page#overview');
  assert.equal(parsed.QUOTED_HASH, 'value with # hash inside quotes');
});

test('load: throws LoadError when file does not exist and silent is false', () => {
  const missingPath = path.join(fixturesDir, '.env.does-not-exist');

  assert.throws(
    () => load({ path: missingPath, silent: false }),
    (err) => {
      assert.equal(err instanceof LoadError, true);
      assert.equal(err.code, 'ENOENT');
      assert.equal(err.filePath, path.resolve(process.cwd(), missingPath));
      assert.match(err.message, /file not found/);
      return true;
    }
  );
});

test('load: suppresses error when file does not exist and silent is true', () => {
  const missingPath = path.join(fixturesDir, '.env.does-not-exist');

  const result = load({ path: missingPath, silent: true });
  assert.deepEqual(result.parsed, {});
  assert.deepEqual(result.loaded, {});
  assert.equal(result.error instanceof LoadError, true);
  assert.equal(result.error.code, 'ENOENT');
});

test('load: ignoreMissing is an alias for silent', () => {
  const missingPath = path.join(fixturesDir, '.env.does-not-exist');

  const result = load({ path: missingPath, ignoreMissing: true });
  assert.deepEqual(result.parsed, {});
  assert.deepEqual(result.loaded, {});
});

test('load: propagates ParseError and decorates it with filePath when file is malformed', () => {
  const malformedPath = path.join(fixturesDir, '.env.malformed');

  assert.throws(
    () => load({ path: malformedPath }),
    (err) => {
      assert.equal(err instanceof ParseError, true);
      assert.equal(err.line, 2);
      assert.equal(err.filePath, path.resolve(process.cwd(), malformedPath));
      assert.match(err.message, /Missing '=' delimiter/);
      return true;
    }
  );
});

test('load: mutates process.env when target is not specified', () => {
  const testKey = 'ENVGUARD_TEST_GLOBAL_' + Date.now();
  const filePath = path.join(fixturesDir, '.env.basic');

  try {
    delete process.env[testKey];
    load({ path: filePath });
    // Verify an entry from .env.basic made it to process.env
    assert.equal(process.env.APP_NAME, 'envguard-lite');
  } finally {
    // Cleanup
    delete process.env.APP_NAME;
    delete process.env.PORT;
    delete process.env.DEBUG;
    delete process.env.EMPTY_VAL;
    delete process.env.EQUALS_VAL;
    delete process.env.EXPORTED_VAR;
  }
});

test('config: acts as an exact alias for load', () => {
  const targetEnv = {};
  const filePath = path.join(fixturesDir, '.env.basic');

  const result = config({ path: filePath, processEnv: targetEnv });
  assert.equal(result.parsed.APP_NAME, 'envguard-lite');
  assert.equal(targetEnv.APP_NAME, 'envguard-lite');
});
