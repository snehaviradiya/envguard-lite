export type Environment = Record<string, string | undefined>;

export interface ParseOptions {
  strictKeys?: boolean;
}

export interface LoadOptions {
  path?: string;
  encoding?: BufferEncoding;
  override?: boolean;
  processEnv?: Environment;
  silent?: boolean;
  ignoreMissing?: boolean;
  strictKeys?: boolean;
}

export interface LoadResult {
  parsed: Record<string, string>;
  loaded: Record<string, string>;
  error?: LoadError;
}

export type ValidationPattern = string | RegExp;

interface ValidationRuleBase<DefaultValue> {
  required?: boolean;
  default?: DefaultValue;
  pattern?: ValidationPattern;
}

export interface StringValidationRule extends ValidationRuleBase<string> {
  type: 'string';
  enum?: readonly string[];
}

export interface NumberValidationRule extends ValidationRuleBase<number> {
  type: 'number';
  enum?: readonly number[];
}

export interface BooleanValidationRule extends ValidationRuleBase<boolean> {
  type: 'boolean';
  enum?: readonly boolean[];
}

export interface UrlValidationRule extends ValidationRuleBase<string> {
  type: 'url';
  enum?: readonly string[];
}

export type ValidationRule =
  | StringValidationRule
  | NumberValidationRule
  | BooleanValidationRule
  | UrlValidationRule;

export type ValidationSchema = Record<string, ValidationRule>;

type ParsedValue<Rule> = Rule extends { type: 'number' }
  ? number
  : Rule extends { type: 'boolean' }
    ? boolean
    : string;

type RuleValue<Rule> =
  | (Rule extends { enum: readonly (infer EnumValue)[] } ? EnumValue : ParsedValue<Rule>)
  | (Rule extends { default: infer DefaultValue } ? DefaultValue : never);

type RequiredKeys<Schema extends ValidationSchema> = {
  [Key in keyof Schema]-?: Schema[Key] extends { required: true }
    ? Key
    : Schema[Key] extends { default: unknown }
      ? Key
      : never;
}[keyof Schema];

export type ValidatedConfig<Schema extends ValidationSchema> = {
  [Key in RequiredKeys<Schema>]: RuleValue<Schema[Key]>;
} & {
  [Key in Exclude<keyof Schema, RequiredKeys<Schema>>]?: RuleValue<Schema[Key]>;
};

export class EnvGuardError extends Error {
  constructor(message: string, code?: string);
  code: string;
}

export interface ParseErrorOptions {
  line?: number;
  column?: number;
  rawLine?: string;
  code?: string;
}

export class ParseError extends EnvGuardError {
  constructor(message: string, options?: ParseErrorOptions);
  line: number | undefined;
  column: number | undefined;
  rawLine: string | undefined;
  filePath?: string;
}

export interface LoadErrorOptions {
  filePath?: string;
  code?: string;
  cause?: Error;
}

export class LoadError extends EnvGuardError {
  constructor(message: string, options?: LoadErrorOptions);
  filePath: string | undefined;
  cause: Error | undefined;
}

export class ValidationError extends EnvGuardError {
  constructor(messages: string | string[], options?: { code?: string });
  messages: string[];
}

export function parse(src: string | Buffer, options?: ParseOptions): Record<string, string>;
export function load(options?: LoadOptions): LoadResult;
export function config(options?: LoadOptions): LoadResult;
export function validateEnv<const Schema extends ValidationSchema>(
  schema: Schema,
  env?: Environment
): ValidatedConfig<Schema>;

declare const envguard: {
  parse: typeof parse;
  load: typeof load;
  config: typeof config;
  EnvGuardError: typeof EnvGuardError;
  ParseError: typeof ParseError;
  LoadError: typeof LoadError;
  ValidationError: typeof ValidationError;
  validateEnv: typeof validateEnv;
};

export default envguard;
