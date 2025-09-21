import fs from "fs";
import path from "path";
import os from "os";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export const API_BASE_URL = "https://cli.hosby.io/cli";

/**
 * Configuration interface for Hosby CLI
 */
export interface HosbyConfig {
  credentials?: {
    apiKeyId?: string;
    privateKey?: string;
    openaiApiKey?: string;
  };
  logLevel?: LogLevel;
  defaultTimeout?: number;
  checkForUpdates?: boolean;
}

const DEFAULT_CONFIG: HosbyConfig = {
  logLevel: LogLevel.INFO,
  defaultTimeout: 30000,
  checkForUpdates: true,
};

const CONFIG_DIR = path.join(os.homedir(), ".hosby");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

/**
 * Gets the current configuration
 * @returns {HosbyConfig} The current configuration
 */
export function getConfig(): HosbyConfig {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
      return { ...DEFAULT_CONFIG };
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error("Error reading config file:", error);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Updates the configuration
 * @param {Partial<HosbyConfig>} updates - Configuration updates
 * @returns {HosbyConfig} The updated configuration
 */
export function updateConfig(updates: Partial<HosbyConfig>): HosbyConfig {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const currentConfig = getConfig();
    const newConfig = { ...currentConfig, ...updates };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    return newConfig;
  } catch (error) {
    console.error("Error updating config file:", error);
    return getConfig();
  }
}

/**
 * Gets the user credentials
 * @returns {HosbyConfig['credentials']} User credentials
 */
export function getCredentials(): HosbyConfig["credentials"] {
  return getConfig().credentials;
}

/**
 * Updates the user credentials
 * @param {HosbyConfig['credentials']} credentials - User credentials
 */
export function updateCredentials(credentials: HosbyConfig["credentials"]): void {
  const config = getConfig();
  updateConfig({
    ...config,
    credentials: {
      ...config.credentials,
      ...credentials,
    },
  });
}

/**
 * Gets the log level from config or environment variable
 * @returns {LogLevel} The current log level
 */
export function getLogLevel(): LogLevel {
  try {
    // Environment variable takes precedence
    const envLogLevel = process.env.HOSBY_LOG_LEVEL?.toLowerCase();
    if (envLogLevel) {
      switch (envLogLevel) {
        case "debug":
          return LogLevel.DEBUG;
        case "info":
          return LogLevel.INFO;
        case "warn":
          return LogLevel.WARN;
        case "error":
          return LogLevel.ERROR;
        case "none":
          return LogLevel.NONE;
      }
    }

    try {
      if (!fs.existsSync(CONFIG_DIR) || !fs.existsSync(CONFIG_FILE)) {
        return LogLevel.INFO;
      }

      const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      if (
        typeof configData.logLevel === "number" &&
        configData.logLevel >= LogLevel.DEBUG &&
        configData.logLevel <= LogLevel.NONE
      ) {
        return configData.logLevel;
      }
      return LogLevel.INFO;
    } catch (error) {
      return LogLevel.INFO;
    }
  } catch (error) {
    return LogLevel.INFO;
  }
}

/**
 * Gets the default timeout for network operations
 * @returns {number} Timeout in milliseconds
 */
export function getDefaultTimeout(): number {
  return getConfig().defaultTimeout ?? 30000;
}
