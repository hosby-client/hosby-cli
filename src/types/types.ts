/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Supported AI providers  {"openai" | "claude"}
 */
export type AIProvider = "openai" | "claude";

// Define a custom spinner type that matches what's being passed in
export type SimpleSpinner = {
  text: string;
  succeed: (text: string) => void;
  fail: (text: string) => void;
};

// Define a type for API errors
export type ApiError = {
  code?: string;
  response?: {
    status?: number;
    statusText?: string;
    data?: unknown;
  };
};
/**
 * Last push data structure
 * @property {string} time - Time of the last push
 * @property {string} hash - Hash of the schema at the last push
 * @property {string} id - Project ID
 */
export type LastPushData = {
  time: string;
  hash: string;
  id: string;
};

/**
 * Schema structure for Hosby
 * @property {Object} tables - Tables in the schema
 * @property {Object} [metadata] - Optional metadata
 * @property {string} [version] - Optional version
 * @property {any} [key: string] - Additional properties
 */
export interface HosbySchema {
  tables: Record<string, Record<string, string | object>>;
  metadata?: Record<string, unknown>;
  version?: string;
  [key: string]: unknown;
}

/**
 * Authentication credentials
 * @property {string} userId - User ID
 * @property {string} cliToken - CLI token
 * @property {string} sessionToken - Session token
 */
export interface AuthCredentials {
  userId: string;
  cliToken: string;
  sessionToken: string;
}

/**
 * Project credentials
 * @property {string} id - Project ID
 * @property {string} name - Project name
 */
export type ProjectCredentials = {
  id: string;
  name: string;
};

/**
 * Options for AI analysis
 * @property {string} [apiKey] - API key to use for the AI provider
 * @property {number} [timeout] - Timeout in milliseconds for the AI request
 * @property {AIProvider} [provider] - AI provider to use (openai or claude)
 * @property {string} [customPrompt] - Custom prompt to use instead of the default system prompt
 */
export type AnalyzeOptions = {
  apiKey?: string;
  timeout?: number;
  provider?: AIProvider;
  customSystemPrompt?: string;
};

/**
 * AI provider configuration
 * @property {string} name - Display name of the AI provider
 * @property {string} keyPrefix - Expected prefix for API keys (e.g., 'sk-' for OpenAI)
 * @property {string} credentialKey - Key used to store credentials in local storage
 * @property {string} envVarName - Environment variable name for the API key
 * @property {string} defaultModel - Default model to use for this provider
 * @property {function} validateKey - Function to validate API key format
 */
export type AIProviderConfig = {
  name: string;
  keyPrefix: string;
  credentialKey: string;
  envVarName: string;
  defaultModel: string;
  validateKey: (key: string) => boolean | string;
};

/**
 * Schema data structure
 * @property {Object} tables - Tables in the schema
 * @property {Object} [key: string] - Additional properties
 */
export type SchemaData = {
  tables: Record<string, any>;
  [key: string]: any;
};

/**
 * Server response structure
 * @property {SchemaData} [schema] - Schema data
 * @property {string} [message] - Message from the server
 * @property {Object} [key: string] - Additional properties
 */
export type ServerResponse = {
  schema?: SchemaData;
  message?: string;
  [key: string]: any;
};

/**
 * Last pull data structure
 * @property {string} time - Time of the last pull
 * @property {string} hash - Hash of the schema at the last pull
 */
export type LastPullData = {
  time: string;
  hash: string;
};

/**
 * Action choices for conflict resolution
 * @enum {string}
 */
export enum ConflictAction {
  SERVER = "server",
  LOCAL = "local",
  MERGE = "merge",
  DIFF = "diff",
}

/**
 * Configuration for supported AI providers
 * @const AI_PROVIDERS
 */
export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  openai: {
    name: "OpenAI",
    keyPrefix: "sk-",
    credentialKey: "openai-api-key",
    envVarName: "OPENAI_API_KEY",
    defaultModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    validateKey: (key: string) => {
      if (!key.startsWith("sk-")) return "Invalid OpenAI API key format (should start with 'sk-')";
      return true;
    },
  },
  claude: {
    name: "Claude AI",
    keyPrefix: "sk-",
    credentialKey: "claude-api-key",
    envVarName: "ANTHROPIC_API_KEY",
    defaultModel: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
    validateKey: (key: string) => {
      if (!key) return "API key is required";
      return true;
    },
  },
};
