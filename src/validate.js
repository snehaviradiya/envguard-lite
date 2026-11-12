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
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new ValidationError('Validation schema must be an object');
  }

  const result = {};
  const errors = [];

  for (const [key, def] of Object.entries(schema)) {
    if (def === null || typeof def !== 'object' || Array.isArray(def)) {
      errors.push(`Invalid validation rule for variable ${key}`);
      continue;
    }

    const raw = env[key];
    const isMissing = raw === undefined || raw === null || raw === '';
    const { type, required = false, default: defValue, enum: allowed, pattern } = def;

    if (!['string', 'number', 'boolean', 'url'].includes(type)) {
      errors.push(`Unsupported type '${type}' for variable ${key}`);
      continue;
    }

    if (isMissing && required && defValue === undefined) {
      errors.push(`Missing required environment variable: ${key}`);
      continue;
    }
    if (isMissing && defValue === undefined) {
      continue;
    }

    let parsed;
    if (isMissing) {
      parsed = defValue;
      const expectedType = type === 'number' ? 'number' : type === 'boolean' ? 'boolean' : 'string';
      if (typeof parsed !== expectedType || (type === 'number' && Number.isNaN(parsed))) {
        errors.push(`Default value for ${key} must be a ${expectedType}`);
        continue;
      }

      if (type === 'url') {
        try {
          new URL(parsed);
        } catch (_) {
          errors.push(`Default value for ${key} must be a valid URL`);
          continue;
        }
      }
    } else {
      try {
        switch (type) {
          case 'string':
            parsed = String(raw);
            break;
          case 'number': {
            if (typeof raw === 'string' && raw.trim() === '') {
              throw new ValidationError(`Environment variable ${key} must be a valid number`);
            }
            const num = Number(raw);
            if (Number.isNaN(num)) {
              throw new ValidationError(`Environment variable ${key} must be a valid number`);
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
              throw new ValidationError(`Environment variable ${key} must be 'true' or 'false'`);
            }
            break;
          }
          case 'url': {
            try {
              new URL(raw);
              parsed = raw;
            } catch (_) {
              throw new ValidationError(`Environment variable ${key} must be a valid URL`);
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
    }

    if (Array.isArray(allowed)) {
      if (!allowed.includes(parsed)) {
        errors.push(`Environment variable ${key} must match one of the configured values`);
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
        errors.push(`Environment variable ${key} does not match required pattern ${regex}`);
        continue;
      }
    }

    Object.defineProperty(result, key, {
      value: parsed,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return result;
}
