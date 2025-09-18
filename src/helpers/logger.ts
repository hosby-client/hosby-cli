/**
 * Logger utility for consistent logging throughout the application
 * Provides different log levels and formatting options
 */
import { LogLevel } from '../config/config.js';

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m"
};

// Re-export LogLevel for convenience
export { LogLevel };

let currentLogLevel = LogLevel.INFO;

// Initialize log level from environment variable if available
try {
  const envLogLevel = process.env.HOSBY_LOG_LEVEL?.toLowerCase();
  if (envLogLevel) {
    switch (envLogLevel) {
      case 'debug': currentLogLevel = LogLevel.DEBUG; break;
      case 'info': currentLogLevel = LogLevel.INFO; break;
      case 'warn': currentLogLevel = LogLevel.WARN; break;
      case 'error': currentLogLevel = LogLevel.ERROR; break;
      case 'none': currentLogLevel = LogLevel.NONE; break;
    }
  }
} catch (error) {
  console.warn("Failed to parse log level from environment, using default");
}

/**
 * Sets the global log level
 * @param {LogLevel} level - The log level to set
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Formats a log message with timestamp and optional color
 * @param {string} message - The message to format
 * @param {string} color - ANSI color code to use
 * @returns {string} Formatted message
 */
function formatMessage(message: string, color: string = ""): string {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  return `${color}[${timestamp}] ${message}${colors.reset}`;
}

/**
 * Logs a debug message
 * @param {string} message - The message to log
 * @param {unknown} data - Optional data to include
 */
export function debug(message: string, data?: unknown): void {
  if (currentLogLevel <= LogLevel.DEBUG) {
    console.debug(formatMessage(`DEBUG: ${message}`, colors.gray));
    if (data !== undefined) {
      console.debug(colors.gray, data, colors.reset);
    }
  }
}

/**
 * Logs an info message
 * @param {string} message - The message to log
 * @param {unknown} data - Optional data to include
 */
export function info(message: string, data?: unknown): void {
  if (currentLogLevel <= LogLevel.INFO) {
    console.info(formatMessage(`INFO: ${message}`, colors.blue));
    if (data !== undefined) {
      console.info(data);
    }
  }
}

/**
 * Logs a warning message
 * @param {string} message - The message to log
 * @param {unknown} data - Optional data to include
 */
export function warn(message: string, data?: unknown): void {
  if (currentLogLevel <= LogLevel.WARN) {
    console.warn(formatMessage(`WARNING: ${message}`, colors.yellow));
    if (data !== undefined) {
      console.warn(colors.yellow, data, colors.reset);
    }
  }
}

/**
 * Logs an error message
 * @param {string} message - The message to log
 * @param {Error|unknown} error - Optional error object or data
 */
export function error(message: string, error?: Error | unknown): void {
  if (currentLogLevel <= LogLevel.ERROR) {
    console.error(formatMessage(`ERROR: ${message}`, colors.red));
    if (error) {
      if (error instanceof Error) {
        console.error(colors.red, error.message, colors.reset);
        if (error.stack) {
          console.error(colors.gray, error.stack.split('\n').slice(1).join('\n'), colors.reset);
        }
      } else {
        console.error(colors.red, error, colors.reset);
      }
    }
  }
}

/**
 * Logs a success message
 * @param {string} message - The message to log
 */
export function success(message: string): void {
  if (currentLogLevel <= LogLevel.INFO) {
    console.log(formatMessage(`SUCCESS: ${message}`, colors.green));
  }
}

/**
 * Creates a logger instance with a module prefix
 * @param {string} moduleName - Name of the module using the logger
 * @returns {Object} Logger instance with module context
 */
type LoggerFunction = (message: string, data?: unknown) => void;

export function createLogger(moduleName: string): Record<string, LoggerFunction> {
  const modulePrefix = `[${moduleName}]`;
  
  return {
    debug: (message: string, data?: unknown) => debug(`${modulePrefix} ${message}`, data),
    info: (message: string, data?: unknown) => info(`${modulePrefix} ${message}`, data),
    warn: (message: string, data?: unknown) => warn(`${modulePrefix} ${message}`, data),
    error: (message: string, err?: Error | unknown) => error(`${modulePrefix} ${message}`, err),
    success: (message: string) => success(`${modulePrefix} ${message}`)
  };
}

export default {
  debug,
  info,
  warn,
  error,
  success,
  setLogLevel,
  LogLevel,
  createLogger
};
