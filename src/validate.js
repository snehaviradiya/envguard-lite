import { EnvGuardError } from './errors.js';

/**
 * Error thrown when environment validation fails.
 */
export class ValidationError extends EnvGuardError {
  /**
   * @param {string|string[]} messages - Single error message or array of messages.
   * @param {object} [options={}] - Additional context.
   */
  constructor(messages, { code = 'ERR_VALIDATION' } = {}) {
    const message = Array.isArray(messages) ? messages.join('; ') : messages;
    super(message, code);
    this.name = 'ValidationError';
    this.messages = Array.isArray(messages) ? messages : [messages];
  }
}

/**
 * Validate environment variables against a schema.
 *
 * @param {Record<string, {type: 'string'|'number'|'boolean'|'url', required?: boolean, default?: any, enum?: any[], pattern?: string|RegExp}>} schema
 * @param {Record<string, string|undefined>} [env=process.env] - Environment object to validate (defaults to process.env).
 * @returns {Record<string, any>} Validated and typed configuration object.
 * @throws {ValidationError} If required variables are missing or values cannot be parsed.
 */
export function validateEnv(schema, env = process.env) {
  const result = {};
  const errors = [];

  for (const [key, def] of Object.entries(schema)) {
    const raw = env[key];
    const isMissing = raw === undefined || raw === null || raw === '';
    const { type, required = false, default: defValue, enum: allowed, pattern } = def;

    if (isMissing) {
      if (required && defValue === undefined) {
        errors.push(`Missing required environment variable: ${key}`);
        continue;
      }
      if (defValue !== undefined) {
        result[key] = defValue;
      }
      continue;
    }

    let parsed;
    try {
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
        case 'url': {
          try {
            new URL(raw);
            parsed = raw;
          } catch (_) {
            throw new ValidationError(`Environment variable ${key} must be a valid URL, got '${raw}'`);
          }
          break;
        }
        default:
          throw new ValidationError(`Unsupported type '${type}' for variable ${key}`);
      }
    } catch (e) {
      errors.push(e instanceof ValidationError ? e.message : e.message);
      continue;
    }

    if (Array.isArray(allowed)) {
      if (!allowed.includes(parsed)) {
        errors.push(`Environment variable ${key} must be one of ${JSON.stringify(allowed)}, got '${parsed}'`);
        continue;
      }
    }

    if (pattern) {
      let regex;
      try {
        regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      } catch (e) {
        errors.push(`Invalid pattern for ${key}: ${e.message}`);
        continue;
      }
      if (!regex.test(String(parsed))) {
        errors.push(`Environment variable ${key} does not match required pattern ${regex}, got '${parsed}'`);
        continue;
      }
    }

    result[key] = parsed;
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return result;
}
