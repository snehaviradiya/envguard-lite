import { ParseError } from './errors.js';

const VALID_KEY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Unescapes escape sequences inside double-quoted strings.
 *
 * @param {string} str - Raw double-quoted string content.
 * @returns {string} - Unescaped string.
 */
function unescapeDoubleQuoted(str) {
  return str.replace(/\\([nrtbfv\\"$]|u[0-9a-fA-F]{4})/g, (match, esc) => {
    switch (esc[0]) {
      case 'n': return '\n';
      case 'r': return '\r';
      case 't': return '\t';
      case 'b': return '\b';
      case 'f': return '\f';
      case 'v': return '\v';
      case '\\': return '\\';
      case '"': return '"';
      case '$': return '$';
      case 'u': return String.fromCharCode(parseInt(esc.slice(1), 16));
      default: return match;
    }
  });
}

/**
 * Finds the index of the matching closing quote, respecting backslash escapes.
 *
 * @param {string} text - The text to scan.
 * @param {number} startIndex - Index immediately after the opening quote.
 * @param {string} quoteChar - The quote character ('"', "'", or '`').
 * @returns {number} - Index of the closing quote, or -1 if not found.
 */
function findClosingQuote(text, startIndex, quoteChar) {
  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    if (char === '\\') {
      // Skip the escaped character
      i++;
      continue;
    }
    if (char === quoteChar) {
      return i;
    }
  }
  return -1;
}

/**
 * Parses a string or Buffer containing .env file contents into an object.
 *
 * @param {string|Buffer} src - The contents to parse.
 * @param {object} [options={}] - Parser options.
 * @param {boolean} [options.strictKeys=true] - Enforce standard variable naming rules.
 * @returns {Record<string, string>} Key-value dictionary of parsed environment variables.
 * @throws {TypeError} If src is not a string or Buffer.
 * @throws {ParseError} If malformed syntax is encountered.
 */
export function parse(src, options = {}) {
  const { strictKeys = true } = options;

  let content;
  if (Buffer.isBuffer(src)) {
    content = src.toString('utf8');
  } else if (typeof src === 'string') {
    content = src;
  } else {
    throw new TypeError(`Expected input to be a string or Buffer, received ${src === null ? 'null' : typeof src}`);
  }

  const result = {};
  // Normalize Windows CRLF to LF, then split into lines
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let multilineState = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const rawLine = lines[i];

    // Handle multiline continuation
    if (multilineState !== null) {
      const { quote, key, startLine } = multilineState;
      const closingIndex = findClosingQuote(rawLine, 0, quote);

      if (closingIndex === -1) {
        // Still not closed: append the entire line and continue
        multilineState.accumulated += '\n' + rawLine;
        continue;
      }

      // Found closing quote on this line
      const valuePart = multilineState.accumulated + '\n' + rawLine.slice(0, closingIndex);
      const remainder = rawLine.slice(closingIndex + 1).trim();

      if (remainder.length > 0 && !remainder.startsWith('#')) {
        throw new ParseError(
          `Unexpected characters after closing quote: '${remainder}'`,
          { line: lineNumber, rawLine }
        );
      }

      let parsedValue = valuePart;
      if (quote === '"') {
        parsedValue = unescapeDoubleQuoted(parsedValue);
      } else if (quote === "'") {
        parsedValue = parsedValue.replace(/\\'/g, "'");
      }

      result[key] = parsedValue;
      multilineState = null;
      continue;
    }

    const trimmed = rawLine.trim();

    // Skip empty lines
    if (trimmed.length === 0) {
      continue;
    }

    // Skip comments
    if (trimmed.startsWith('#')) {
      continue;
    }

    // Support optional "export " prefix (e.g., export KEY=value)
    let lineToParse = trimmed;
    if (lineToParse.startsWith('export ') || lineToParse.startsWith('export\t')) {
      lineToParse = lineToParse.replace(/^export[\s\t]+/, '');
    }

    // Find the '=' delimiter
    const delimiterIndex = lineToParse.indexOf('=');
    if (delimiterIndex === -1) {
      throw new ParseError(
        `Missing '=' delimiter in assignment: '${rawLine.trim()}'`,
        { line: lineNumber, rawLine }
      );
    }

    const rawKey = lineToParse.slice(0, delimiterIndex).trim();
    const rawValue = lineToParse.slice(delimiterIndex + 1);

    // Validate key
    if (rawKey.length === 0) {
      throw new ParseError('Empty variable key in assignment', {
        line: lineNumber,
        rawLine
      });
    }

    if (strictKeys && !VALID_KEY_REGEX.test(rawKey)) {
      throw new ParseError(
        `Invalid variable key '${rawKey}'. Keys must start with a letter or underscore and contain only alphanumeric characters or underscores.`,
        { line: lineNumber, rawLine }
      );
    } else if (!strictKeys && /\s/.test(rawKey)) {
      throw new ParseError(`Invalid variable key '${rawKey}'. Keys cannot contain whitespace.`, {
        line: lineNumber,
        rawLine
      });
    }

    // Process value
    const trimmedVal = rawValue.trim();

    // Empty value
    if (trimmedVal.length === 0) {
      result[rawKey] = '';
      continue;
    }

    const firstChar = trimmedVal[0];
    const isQuoted = firstChar === '"' || firstChar === "'" || firstChar === '`';

    if (isQuoted) {
      const quoteChar = firstChar;
      // Find the closing quote starting from index 1 of trimmedVal
      const closingIndex = findClosingQuote(trimmedVal, 1, quoteChar);

      if (closingIndex === -1) {
        // Begins a multiline quoted value
        multilineState = {
          quote: quoteChar,
          key: rawKey,
          startLine: lineNumber,
          accumulated: trimmedVal.slice(1)
        };
        continue;
      }

      // Closing quote is on the same line
      const rawInner = trimmedVal.slice(1, closingIndex);
      const remainder = trimmedVal.slice(closingIndex + 1).trim();

      if (remainder.length > 0 && !remainder.startsWith('#')) {
        throw new ParseError(
          `Unexpected characters after closing quote: '${remainder}'`,
          { line: lineNumber, rawLine }
        );
      }

      let parsedValue = rawInner;
      if (quoteChar === '"') {
        parsedValue = unescapeDoubleQuoted(parsedValue);
      } else if (quoteChar === "'") {
        parsedValue = parsedValue.replace(/\\'/g, "'");
      }

      result[rawKey] = parsedValue;
    } else {
      // Unquoted value: check for inline comment preceded by whitespace
      let finalValue = rawValue;
      const inlineCommentMatch = finalValue.search(/\s+#/);
      if (inlineCommentMatch !== -1) {
        finalValue = finalValue.slice(0, inlineCommentMatch);
      }

      result[rawKey] = finalValue.trim();
    }
  }

  if (multilineState !== null) {
    throw new ParseError(
      `Unclosed ${multilineState.quote} quote starting at line ${multilineState.startLine}`,
      { line: multilineState.startLine }
    );
  }

  return result;
}
