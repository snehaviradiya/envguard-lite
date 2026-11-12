# envguard-lite

[![CI](https://github.com/snehaviradiya/envguard-lite/actions/workflows/ci.yml/badge.svg)](https://github.com/snehaviradiya/envguard-lite/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A zero-runtime-dependency environment variable parser, loader, and validator for Node.js (>= 18). Built with standard ESM architecture, native URL validation, regular expression patterns, safe error aggregation, and TypeScript declarations.

Repository: [https://github.com/snehaviradiya/envguard-lite](https://github.com/snehaviradiya/envguard-lite)

## Installation

```bash
npm install @snehav27/envguard-lite
```

For TypeScript projects, use a supported TypeScript version and install Node.js type declarations if your project does not already provide them:

```bash
npm install --save-dev typescript @types/node
```

## JavaScript usage

```js
import { load, validateEnv, ValidationError } from '@snehav27/envguard-lite';

load(); // Reads .env from the current working directory without overwriting existing variables.

try {
  const config = validateEnv({
    APP_NAME: { type: 'string', required: true },
    PORT: { type: 'number', default: 3000 },
    DEBUG: { type: 'boolean', default: false },
    NODE_ENV: { type: 'string', enum: ['development', 'production', 'test'], default: 'development' },
    API_URL: { type: 'url', required: true },
    INSTANCE_ID: { type: 'string', pattern: /^[a-z0-9-]+$/, required: true }
  });
  console.log(config);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid environment configuration.');
  }
}
```

## TypeScript usage

Declarations are resolved from the package's root ESM export. Both named and default imports are supported:

```ts
import envguard, { load, validateEnv, ValidationError } from '@snehav27/envguard-lite';

load();

try {
  const config = validateEnv({
    APP_NAME: { type: 'string', required: true },
    PORT: { type: 'number', default: 3000 },
    DEBUG: { type: 'boolean', default: false },
    NODE_ENV: { type: 'string', enum: ['development', 'production'] as const, default: 'development' },
    API_URL: { type: 'url', required: true }
  });

  config.PORT; // number
  config.NODE_ENV; // 'development' | 'production'
  envguard.parse('KEY=value');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid environment configuration.');
  }
}
```

## Parsing and loading

- `parse(input, options?)` accepts a string or Node.js `Buffer` and returns `Record<string, string>`. `strictKeys` defaults to `true`.
- `load(options?)` reads `.env` from the current working directory by default, populates `process.env`, and returns `{ parsed, loaded, error? }`.
- `config(options?)` is an alias of `load()`.
- Existing environment values are kept unless `override: true` is set. Use `processEnv` to provide a custom string environment object.
- `silent: true` or `ignoreMissing: true` ignores a missing file and returns its `LoadError` in `error`.

## Validation options

`validateEnv(schema, env?)` reads from `process.env` unless an environment object is provided. Each schema entry supports:

- `type`: `string`, `number`, `boolean`, or `url`. Numbers use JavaScript number conversion; booleans accept only the strings `true` and `false`; URLs are checked with the Node.js `URL` constructor.
- `required`: if `true`, a missing or empty value is an error unless a default is supplied.
- `default`: a typed fallback used when a value is missing or empty. Defaults must match the declared type and are checked against enum and pattern rules.
- `enum`: an array of allowed values, checked after parsing and for defaults.
- `pattern`: a regular expression or regex string, checked against the string form of the parsed value and defaults.

Validation errors are aggregated where possible. `ValidationError.messages` contains individual messages identifying the variable and issue without echoing supplied environment values. The example handles failures with a generic message as an additional precaution.

## Security

- **Secret Redaction**: Validation error messages identify invalid variable keys and expected constraints, but never echo raw environment values. This prevents sensitive credentials (such as API tokens, database connection strings, and passwords) from leaking into console logs, exception handlers, or APM monitoring tools.
- **Zero Runtime Dependencies**: The library contains zero third-party runtime dependencies, eliminating external supply-chain vulnerabilities.
- **Safe Regular Expression Evaluation**: Regex pattern compilation errors are caught and surfaced safely within `ValidationError` rather than crashing the process unhandled.

## Integration example

The runnable HTTP health-check example, including a dummy-only environment template, is in [`examples/`](examples/README.md). From the repository root:

```bash
cp examples/.env.example .env
npm run example
```

Then request `http://127.0.0.1:3000/health`. The root `.env` file is ignored by Git; do not put real credentials in the checked-in example template.

## Checks

```bash
npm test
npm run test:types
npm run test:example
npm pack --dry-run
```

The test suite uses Node.js's built-in test runner. TypeScript is used only for development checks and is not a runtime dependency.

## Compatibility

The package exports ESM and declares Node.js `>= 18`. TypeScript resolution uses the package `types` export condition; Node.js runtime consumers do not need TypeScript installed.

## License

MIT
