/**
 * Base error class for all EnvGuard errors.
 */
export class EnvGuardError extends Error {
  /**
   * @param {string} message - Error description.
   * @param {string} [code='ERR_ENVGUARD'] - Error code identifier.
   */
  constructor(message, code = 'ERR_ENVGUARD') {
    super(message);
    this.name = 'EnvGuardError';
    this.code = code;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when an environment variable file or string fails parsing.
 */
export class ParseError extends EnvGuardError {
  /**
   * @param {string} message - Description of the parse failure.
   * @param {object} [options={}] - Additional parse context.
   * @param {number} [options.line] - 1-based line number where the error occurred.
   * @param {number} [options.column] - 1-based column number where the error occurred.
   * @param {string} [options.rawLine] - The problematic line content.
   * @param {string} [options.code='ERR_PARSE'] - Specific error code.
   */
  constructor(message, { line, column, rawLine, code = 'ERR_PARSE' } = {}) {
    const formattedMessage = line != null
      ? `Parse error at line ${line}: ${message}`
      : `Parse error: ${message}`;

    super(formattedMessage, code);
    this.name = 'ParseError';
    this.line = line;
    this.column = column;
    this.rawLine = rawLine;
  }
}

/**
 * Error thrown when an environment file cannot be located, opened, or read.
 */
export class LoadError extends EnvGuardError {
  /**
   * @param {string} message - Description of the load failure.
   * @param {object} [options={}] - Additional file loading context.
   * @param {string} [options.filePath] - Resolved path to the attempted file.
   * @param {string} [options.code='ERR_LOAD'] - System or library error code.
   * @param {Error} [options.cause] - Underlying root cause error.
   */
  constructor(message, { filePath, code = 'ERR_LOAD', cause } = {}) {
    super(message, code);
    this.name = 'LoadError';
    this.filePath = filePath;
    this.cause = cause;
  }
}
