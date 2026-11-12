import envguard, {
  config,
  EnvGuardError,
  LoadError,
  load,
  parse,
  ParseError,
  ValidationError,
  validateEnv
} from '@snehav27/envguard-lite';
import type { Environment } from '@snehav27/envguard-lite';

const parsed: Record<string, string> = parse('PORT=3000');
const parsedBuffer: Record<string, string> = parse(Buffer.from('PORT=3000'), { strictKeys: false });
const customEnv: Environment = { PORT: '3000' };
const loadResult = load({ processEnv: customEnv, silent: true });
const loadWithOptions = load({
  path: '.env.example',
  encoding: 'utf8',
  override: true,
  ignoreMissing: true,
  strictKeys: false,
  processEnv: customEnv
});
const configResult = config({ processEnv: customEnv, silent: true });

const settings = validateEnv({
  PORT: { type: 'number', required: true },
  DEBUG: { type: 'boolean', default: false },
  MODE: { type: 'string', enum: ['development', 'production'] as const, default: 'development' },
  API_URL: { type: 'url', required: true },
  INSTANCE: { type: 'string', pattern: /^[a-z0-9-]+$/ },
  OPTIONAL_NAME: { type: 'string' }
}, customEnv);

const port: number = settings.PORT;
const debug: boolean = settings.DEBUG;
const mode: 'development' | 'production' = settings.MODE;
const apiUrl: string = settings.API_URL;
const optionalName: string | undefined = settings.OPTIONAL_NAME;
const defaultParse: Record<string, string> = envguard.parse('KEY=value');
const defaultValidationError: typeof ValidationError = envguard.ValidationError;

void parsed;
void parsedBuffer;
void loadResult;
void loadWithOptions;
void configResult;
void port;
void debug;
void mode;
void apiUrl;
void optionalName;
const errors: Error[] = [
  new EnvGuardError('base'),
  new ParseError('parse', { line: 1 }),
  new LoadError('load', { filePath: '.env', cause: new Error('cause') }),
  new ValidationError(['first', 'second'])
];

for (const error of errors) {
  if (error instanceof ValidationError) {
    const messages: string[] = error.messages;
    void messages;
  }
}

void defaultParse;
void defaultValidationError;

// @ts-expect-error Number defaults must be numbers.
validateEnv({ PORT: { type: 'number', default: '3000' } });
