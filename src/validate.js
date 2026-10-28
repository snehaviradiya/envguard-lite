import { EnvGuardError } from './errors.js';

/**
 * Error thrown when environment validation fails.
 */
export class ValidationError extends EnvGuardError {
  /**
   * @param {string} message - Description of the validation failure.
   * @param {object} [options={}] - Additional context.
   * @param {string} [options.code='ERR_VALIDATION'] - Error code identifier.
   */
  constructor(message, { code = 'ERR_VALIDATION' } = {}) {
    super(message, code);
    this.name = 'ValidationError';
  }
}

/**
 * Validate environment variables against a schema.
 *
 * @param {Record<string, {type: 'string'|'number'|'boolean', required?: boolean, default?: any}>} schema
 * @param {Record<string, string|undefined>} [env=process.env] - Environment object to validate (defaults to process.env).
 * @returns {Record<string, any>} Validated and typed configuration object.
 * @throws {ValidationError} If required variables are missing or values cannot be parsed.
 */
export function validateEnv(schema, env = process.env) {
  const result = {};

  for (const [key, def] of Object.entries(schema)) {
    const raw = env[key];
    const isMissing = raw === undefined || raw === null || raw === '';
    const { type, required = false, default: defValue } = def;

    if (isMissing) {
      if (required && defValue === undefined) {
        throw new ValidationError(`Missing required environment variable: ${key}`);
      }
      // Use default if provided, otherwise undefined for optional without default
      if (defValue !== undefined) {
        result[key] = defValue;
      }
      continue;
    }

    let parsed;
    switch (type) {
      case 'string':
        parsed = String(raw);
        break;
      case 'number': {
        const num = Number(raw);
        if (Number.isNaN(num)) {
          throw new ValidationError(`Environment variable ${key} must be a valid number, got '${raw}'`);
        }
        parsed = num;
        break;
      }
      case 'boolean': {
        if (raw === 'true') {
          parsed = true;
        } else if (raw === 'false') {
          parsed = false;
        } else {
          throw new ValidationError(`Environment variable ${key} must be 'true' or 'false', got '${raw}'`);
        }
        break;
      }
      default:
        throw new ValidationError(`Unsupported type '${type}' for variable ${key}`);
    }

    result[key] = parsed;
  }

  return result;
}
