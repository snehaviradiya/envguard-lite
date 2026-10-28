/**
 * envguard-lite
 * A lightweight, zero-dependency environment variable loading and parsing library for Node.js applications.
 */

export { parse } from './parser.js';
export { load, config } from './loader.js';
export { EnvGuardError, ParseError, LoadError } from './errors.js';
export { validateEnv } from './validate.js';

import { parse } from './parser.js';
import { load, config } from './loader.js';
import { EnvGuardError, ParseError, LoadError } from './errors.js';
import { validateEnv } from './validate.js';

export default {
  parse,
  load,
  config,
  EnvGuardError,
  ParseError,
  LoadError,
  validateEnv
};
