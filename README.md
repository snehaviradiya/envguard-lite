# envguard-lite

A lightweight, zero‑dependency environment variable validation library for Node.js (>= 18).

## Installation

```bash
npm install envguard-lite
```

## Usage

```js
import { validateEnv } from 'envguard-lite';

const schema = {
  APP_NAME: { type: 'string', required: true },
  PORT: { type: 'number', default: 3000 },
  DEBUG: { type: 'boolean', default: false },
};

const config = validateEnv(schema, process.env);
console.log(config);
```

### Advanced validation options

#### Enum validation
Restrict a variable to a set of allowed values.

```js
const schema = {
  NODE_ENV: {
    type: 'string',
    enum: ['development', 'production', 'test'],
    required: true,
  },
};
```

#### URL validation
Validate that a variable contains a well‑formed URL.

```js
const schema = {
  API_URL: { type: 'url', required: true },
};
```

#### Pattern (regex) validation
Validate a string against a regular expression.

```js
const schema = {
  APP_ID: { type: 'string', pattern: /^[a-z0-9-]+$/ },
};
```

#### Defaults with validation
Defaults are applied before enum/pattern checks, ensuring they also satisfy the rules.

```js
const schema = {
  MODE: { type: 'string', enum: ['dev', 'prod'], default: 'dev' },
  TAG: { type: 'string', pattern: /^v\d+$/, default: 'v1' },
  API_URL: { type: 'url', default: 'https://example.com' },
};
```

### Error handling
When validation fails, a `ValidationError` is thrown. The error aggregates **all** validation problems (when possible) and exposes them via the `messages` array. Sensitive values are not automatically redacted; avoid including secrets in error messages.

```js
import { ValidationError } from 'envguard-lite';

try {
  validateEnv(schema, process.env);
} catch (err) {
  if (err instanceof ValidationError) {
    console.error('Configuration errors:');
    err.messages.forEach(msg => console.error('- ', msg));
  }
}
```

## Export configuration
The package uses the Node.js ESM `exports` field with a conventional `"."` entry for proper imports:

```json
"exports": {
  ".": {
    "import": "./src/index.js"
  },
  "./package.json": "./package.json"
}
```

## License
MIT
