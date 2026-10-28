import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parser.js';
import { ParseError } from '../src/errors.js';

test('parse: basic key-value pairs', () => {
  const input = `
APP_NAME=envguard
PORT=3000
DEBUG=false
`;
  const result = parse(input);
  assert.deepEqual(result, {
    APP_NAME: 'envguard',
    PORT: '3000',
    DEBUG: 'false'
  });
});

test('parse: ignores empty lines, whitespace-only lines, and full-line comments', () => {
  const input = `
# Initial comment

   # Indented comment
KEY_ONE=alpha

\t
KEY_TWO=beta
# Final comment
`;
  const result = parse(input);
  assert.deepEqual(result, {
    KEY_ONE: 'alpha',
    KEY_TWO: 'beta'
  });
});

test('parse: handles inline comments preceded by whitespace', () => {
  const input = `
SERVER=api.local # primary endpoint
TIMEOUT=5000\t# in milliseconds
`;
  const result = parse(input);
  assert.deepEqual(result, {
    SERVER: 'api.local',
    TIMEOUT: '5000'
  });
});

test('parse: preserves # when not preceded by whitespace (e.g., hex colors and URLs)', () => {
  const input = `
HEX_COLOR=#ff00aa
ENDPOINT=https://example.com/docs#installation
`;
  const result = parse(input);
  assert.deepEqual(result, {
    HEX_COLOR: '#ff00aa',
    ENDPOINT: 'https://example.com/docs#installation'
  });
});

test('parse: handles empty values and values with multiple equal signs', () => {
  const input = `
EMPTY_ONE=
EMPTY_TWO=   
CONNECTION_STRING=postgres://user:pass@host:5432/db?sslmode=require&app=test
`;
  const result = parse(input);
  assert.deepEqual(result, {
    EMPTY_ONE: '',
    EMPTY_TWO: '',
    CONNECTION_STRING: 'postgres://user:pass@host:5432/db?sslmode=require&app=test'
  });
});

test('parse: strips bash-style "export" prefix', () => {
  const input = `
export PORT=9000
export\tHOST=localhost
export    NODE_ENV=production
`;
  const result = parse(input);
  assert.deepEqual(result, {
    PORT: '9000',
    HOST: 'localhost',
    NODE_ENV: 'production'
  });
});

test('parse: single-quoted values preserve literal content without escape expansion', () => {
  const input = `
GREETING='Hello world'
RAW_NEWLINE='first\\nsecond'
SINGLE_WITH_HASH='value # with hash'
ESCAPED_QUOTE='it\\'s working'
`;
  const result = parse(input);
  assert.deepEqual(result, {
    GREETING: 'Hello world',
    RAW_NEWLINE: 'first\\nsecond',
    SINGLE_WITH_HASH: 'value # with hash',
    ESCAPED_QUOTE: "it's working"
  });
});

test('parse: double-quoted values expand escape sequences', () => {
  const input = `
NEWLINE="line 1\\nline 2"
TABBED="col1\\tcol2"
CARRIAGE="cr\\r"
ESCAPED_QUOTES="He said \\"hello\\""
ESCAPED_BACKSLASH="C:\\\\path\\\\file"
ESCAPED_DOLLAR="\\$100"
UNICODE="\\u0041\\u0042\\u0043"
`;
  const result = parse(input);
  assert.deepEqual(result, {
    NEWLINE: 'line 1\nline 2',
    TABBED: 'col1\tcol2',
    CARRIAGE: 'cr\r',
    ESCAPED_QUOTES: 'He said "hello"',
    ESCAPED_BACKSLASH: 'C:\\path\\file',
    ESCAPED_DOLLAR: '$100',
    UNICODE: 'ABC'
  });
});

test('parse: backtick-quoted values preserve characters', () => {
  const input = 'BACKTICK=`some value here`';
  const result = parse(input);
  assert.deepEqual(result, {
    BACKTICK: 'some value here'
  });
});

test('parse: allows inline comments after closing quotes', () => {
  const input = `
TOKEN="secret123" # production token
SALT='xyz789'   # cryptographic salt
`;
  const result = parse(input);
  assert.deepEqual(result, {
    TOKEN: 'secret123',
    SALT: 'xyz789'
  });
});

test('parse: supports multiline values in double and single quotes', () => {
  const input = `
CERT="-----BEGIN CERTIFICATE-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
-----END CERTIFICATE-----"
NOTES='Line A
Line B'
NEXT_KEY=ok
`;
  const result = parse(input);
  assert.deepEqual(result, {
    CERT: '-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n-----END CERTIFICATE-----',
    NOTES: 'Line A\nLine B',
    NEXT_KEY: 'ok'
  });
});

test('parse: handles CRLF Windows line endings', () => {
  const input = 'PORT=3000\r\nHOST=localhost\r\nMESSAGE="hello\\r\\nworld"\r\n';
  const result = parse(input);
  assert.deepEqual(result, {
    PORT: '3000',
    HOST: 'localhost',
    MESSAGE: 'hello\r\nworld'
  });
});

test('parse: accepts Buffer input', () => {
  const buffer = Buffer.from('BUFFER_KEY=buffer_value\n');
  const result = parse(buffer);
  assert.deepEqual(result, {
    BUFFER_KEY: 'buffer_value'
  });
});

test('parse: duplicate keys overwrite previous values (last wins)', () => {
  const input = `
KEY=first
KEY=second
`;
  const result = parse(input);
  assert.deepEqual(result, {
    KEY: 'second'
  });
});

// Error handling tests

test('parse: throws TypeError when input is not a string or Buffer', () => {
  assert.throws(() => parse(123), {
    name: 'TypeError',
    message: /Expected input to be a string or Buffer/
  });
  assert.throws(() => parse(null), {
    name: 'TypeError',
    message: /Expected input to be a string or Buffer/
  });
  assert.throws(() => parse({}), {
    name: 'TypeError'
  });
});

test('parse: throws ParseError when line is missing "=" delimiter', () => {
  const input = `
VALID=true
INVALID_LINE_WITHOUT_EQUALS
ANOTHER=valid
`;
  assert.throws(
    () => parse(input),
    (err) => {
      assert.equal(err instanceof ParseError, true);
      assert.equal(err.line, 3);
      assert.match(err.message, /Missing '=' delimiter/);
      return true;
    }
  );
});

test('parse: throws ParseError when variable key is empty', () => {
  const input = '=missing_key';
  assert.throws(
    () => parse(input),
    (err) => {
      assert.equal(err instanceof ParseError, true);
      assert.equal(err.line, 1);
      assert.match(err.message, /Empty variable key/);
      return true;
    }
  );
});

test('parse: throws ParseError on invalid variable key when strictKeys is true', () => {
  assert.throws(
    () => parse('123INVALID=value'),
    (err) => {
      assert.equal(err instanceof ParseError, true);
      assert.equal(err.line, 1);
      assert.match(err.message, /Invalid variable key/);
      return true;
    }
  );

  assert.throws(
    () => parse('KEY-WITH-DASHES=value'),
    (err) => {
      assert.equal(err instanceof ParseError, true);
      assert.equal(err.line, 1);
      assert.match(err.message, /Invalid variable key/);
      return true;
    }
  );
});

test('parse: allows non-alphanumeric keys when strictKeys is false', () => {
  const input = 'my-service.api-key=secret123';
  const result = parse(input, { strictKeys: false });
  assert.deepEqual(result, {
    'my-service.api-key': 'secret123'
  });
});

test('parse: throws ParseError when key contains internal whitespace even if strictKeys is false', () => {
  assert.throws(
    () => parse('KEY WITH SPACE=value', { strictKeys: false }),
    (err) => {
      assert.equal(err instanceof ParseError, true);
      assert.match(err.message, /Keys cannot contain whitespace/);
      return true;
    }
  );
});

test('parse: throws ParseError on unclosed double quote', () => {
  const input = `
LINE_ONE=1
UNCLOSED="started here but never finished
LINE_THREE=3
`;
  assert.throws(
    () => parse(input),
    (err) => {
      assert.equal(err instanceof ParseError, true);
      assert.equal(err.line, 3);
      assert.match(err.message, /Unclosed " quote starting at line 3/);
      return true;
    }
  );
});

test('parse: throws ParseError on unclosed single quote', () => {
  const input = "UNCLOSED='no end";
  assert.throws(
    () => parse(input),
    (err) => {
      assert.equal(err instanceof ParseError, true);
      assert.equal(err.line, 1);
      assert.match(err.message, /Unclosed ' quote/);
      return true;
    }
  );
});

test('parse: throws ParseError on unexpected trailing characters after closing quote', () => {
  const input = 'KEY="valid value" trailing_unexpected_garbage';
  assert.throws(
    () => parse(input),
    (err) => {
      assert.equal(err instanceof ParseError, true);
      assert.equal(err.line, 1);
      assert.match(err.message, /Unexpected characters after closing quote/);
      return true;
    }
  );
});

test('parse: throws ParseError on unexpected trailing characters after multiline closing quote', () => {
  const input = `
KEY="first line
second line" invalid_trailing
`;
  assert.throws(
    () => parse(input),
    (err) => {
      assert.equal(err instanceof ParseError, true);
      assert.equal(err.line, 3);
      assert.match(err.message, /Unexpected characters after closing quote/);
      return true;
    }
  );
});

