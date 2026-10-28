import fs from 'node:fs';
import path from 'node:path';
import { parse } from './parser.js';
import { LoadError, ParseError } from './errors.js';

/**
 * Result returned by `load()` and `config()`.
 * @typedef {object} LoadResult
 * @property {Record<string, string>} parsed - All key-value pairs parsed from the file.
 * @property {Record<string, string>} loaded - Key-value pairs that were actually injected into target environment.
 * @property {LoadError} [error] - Error if loading failed non-fatally (when silent is enabled).
 */

/**
 * Options for configuring environment file loading.
 * @typedef {object} LoadOptions
 * @property {string} [path] - Path to the environment file. Defaults to `.env` in the current working directory.
 * @property {BufferEncoding} [encoding='utf8'] - File encoding.
 * @property {boolean} [override=false] - Whether to overwrite existing environment variables.
 * @property {Record<string, string|undefined>} [processEnv=process.env] - Target environment object to mutate.
 * @property {boolean} [silent=false] - If true, suppress errors when the file is missing.
 * @property {boolean} [ignoreMissing=false] - Alias for `silent`.
 * @property {boolean} [strictKeys=true] - Enforce standard variable naming rules during parsing.
 */

/**
 * Reads and parses an environment file and injects variables into `process.env`.
 *
 * By default, existing environment variables are NOT overwritten (`override: false`).
 *
 * @param {LoadOptions} [options={}] - Configuration options.
 * @returns {LoadResult} The parsed and loaded variables.
 * @throws {LoadError} If the file cannot be read and silent is false.
 * @throws {ParseError} If the file contains malformed syntax.
 */
export function load(options = {}) {
  const {
    path: envFilePath = path.resolve(process.cwd(), '.env'),
    encoding = 'utf8',
    override = false,
    processEnv = process.env,
    silent = false,
    ignoreMissing = false,
    strictKeys = true
  } = options;

  const resolvedPath = path.resolve(process.cwd(), envFilePath);
  const shouldIgnoreMissing = silent || ignoreMissing;

  let rawContent;
  try {
    rawContent = fs.readFileSync(resolvedPath, { encoding });
  } catch (err) {
    if (err.code === 'ENOENT' && shouldIgnoreMissing) {
      return {
        parsed: {},
        loaded: {},
        error: new LoadError(`Environment file not found at "${resolvedPath}"`, {
          filePath: resolvedPath,
          code: 'ENOENT',
          cause: err
        })
      };
    }

    const message = err.code === 'ENOENT'
      ? `Failed to read environment file: file not found at "${resolvedPath}"`
      : `Failed to read environment file at "${resolvedPath}": ${err.message}`;

    throw new LoadError(message, {
      filePath: resolvedPath,
      code: err.code || 'ERR_LOAD',
      cause: err
    });
  }

  let parsed;
  try {
    parsed = parse(rawContent, { strictKeys });
  } catch (err) {
    if (err instanceof ParseError) {
      // Augment the parse error with file context
      err.filePath = resolvedPath;
    }
    throw err;
  }

  const loaded = {};

  for (const [key, value] of Object.entries(parsed)) {
    const isAlreadySet = Object.prototype.hasOwnProperty.call(processEnv, key) && processEnv[key] !== undefined;

    if (override || !isAlreadySet) {
      processEnv[key] = value;
      loaded[key] = value;
    }
  }

  return { parsed, loaded };
}

/**
 * Alias for `load()` to provide familiar convention for users coming from `dotenv`.
 *
 * @param {LoadOptions} [options={}] - Configuration options.
 * @returns {LoadResult}
 */
export const config = load;
