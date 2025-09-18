import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import fs from "fs";
import { Ora } from "ora";
import chalk from "chalk";
import { requireLogin, createAuthHeaders } from "../core/auth.js";
import { getSchemaHash } from "../helpers/utils.js";
import { ApiError, AuthCredentials, LastPushData, ProjectCredentials, SchemaData } from "../types/types.js";
import logger from "../helpers/logger.js";
import { API_BASE_URL } from "../config/config.js";

const API_TIMEOUT = 30000;


/**
 * Gets local schema information including schema data and hash
 * @param {string} schemaFile - Path to the schema file
 * @returns {Promise<{schemaData: SchemaData, schemaHash: string}>}
 */
export async function getLocalSchemaInfo(schemaFile: string): Promise<{
  schemaData: SchemaData;
  schemaHash: string;
}> {
  try {
    const fileContent = fs.readFileSync(schemaFile, "utf-8");
    const schemaData: SchemaData = JSON.parse(fileContent);
    const schemaHash = getSchemaHash(schemaData);

    logger.debug("Schema loaded successfully", {
      size: fileContent.length,
      tables: Object.keys(schemaData.tables || {}).length,
      schemaHash
    });

    return { schemaData, schemaHash };
  } catch (err) {
    logger.error("Failed to read or parse schema file", err);
    throw new Error("Failed to read schema file. The file may be corrupted.");
  }
}

/**
 * Authenticates the user and returns credentials
 * @returns {Promise<AuthCredentials>} Authentication credentials
 * @throws {Error} If authentication fails
 */
export async function authenticate(): Promise<AuthCredentials> {
  try {
    const credentials = await requireLogin();
    logger.debug("Authentication successful", { userId: credentials.userId });
    return credentials;
  } catch (err) {
    logger.error("Authentication failed", err);
    throw new Error("Authentication failed. Please run 'hosby login' to authenticate.");
  }
}

/**
 * Checks if the schema has changed since the last push
 * @param {string} lastPushFile - Path to the last push file
 * @param {string} schemaHash - Hash of the current schema
 * @param {boolean} force - If true, ignore unchanged schema check
 * @returns {Promise<boolean>} True if schema has changed or force is true
 */
export async function hasSchemaChanged(lastPushFile: string, schemaHash: string, force: boolean): Promise<boolean> {
  if (force) {
    logger.debug("Force push requested, skipping schema change check");
    return true;
  }

  try {
    if (fs.existsSync(lastPushFile)) {
      const lastPushData: LastPushData = JSON.parse(fs.readFileSync(lastPushFile, "utf-8"));
      logger.debug("Read last push data", { lastPushHash: lastPushData.hash, currentHash: schemaHash });

      if (lastPushData.hash === schemaHash) {
        logger.info("Schema unchanged since last push", { lastPush: lastPushData.time });
        return false;
      }
    } else {
      logger.debug("No last push file found", { path: lastPushFile });
    }
    return true;
  } catch (err) {
    logger.warn("Could not read last push data", err);
    return true;
  }
}

/**
 * Pushes schema to the server
 * @param {AuthCredentials} authCredentials - User authentication credentials
 * @param {ProjectCredentials} projectCredentials - Project credentials
 * @param {SchemaData} schemaData - Schema data to push
 * @param {string} schemaHash - Hash of the schema
 * @returns {Promise<AxiosResponse>} Server response
 */
export async function pushSchemaToServer(
  authCredentials: AuthCredentials,
  projectCredentials: ProjectCredentials,
  schemaData: SchemaData,
  schemaHash: string
): Promise<AxiosResponse> {
  const axiosConfig: AxiosRequestConfig = {
    ...createAuthHeaders(authCredentials),
    timeout: API_TIMEOUT
  };

  const url = `${API_BASE_URL}/projects/${projectCredentials.id}/push`;

  logger.debug("Sending schema to server", {
    url,
    schemaHash,
    tableCount: Object.keys(schemaData.tables || {}).length
  });

  return axios.post(
    url,
    {
      ...schemaData,
      _meta: {
        schemaHash,
        clientVersion: process.env.npm_package_version || '0.0.0',
        timestamp: new Date().toISOString()
      }
    },
    axiosConfig
  );
}

/**
 * Updates the last push file with current push information
 * @param {string} lastPushFile - Path to the last push file
 * @param {string} schemaHash - Hash of the schema
 * @param {string} projectId - Project ID
 */
export function updateLastPushFile(lastPushFile: string, schemaHash: string, projectId: string): void {
  const lastPushData: LastPushData = {
    time: new Date().toISOString(),
    hash: schemaHash,
    id: projectId
  };

  fs.writeFileSync(lastPushFile, JSON.stringify(lastPushData), "utf-8");
  logger.debug("Updated last push file", {
    time: lastPushData.time,
    hash: schemaHash,
    projectId
  });
}

/**
 * Handles errors that occur during the push operation
 * @param {Error} err - Error object
 * @param {Ora} spinner - Ora spinner instance
 */
export function handlePushError(err: unknown, spinner: Ora): void {
  const apiError = err as ApiError;
  spinner.fail("❌ Error during push operation");
  logger.error("Push operation failed", err);

  if (apiError.code === "ECONNABORTED") {
    console.error(chalk.red("Request timed out. Please check your internet connection and try again."));
    logger.error("Request timeout", { timeout: `${API_TIMEOUT}ms` });
  } else if (apiError.response?.status === 401) {
    console.error(chalk.red("Authentication failed. Please run 'hosby login' to refresh your credentials."));
    logger.error("Authentication failed", {
      status: apiError.response?.status,
      statusText: apiError.response?.statusText
    });
  } else if (apiError.response?.data) {
    console.error(chalk.red("Server error:"), apiError.response.data);
    logger.error("Server error response", {
      status: apiError.response?.status,
      data: apiError.response?.data
    });
  } else if (err instanceof Error) {
    console.error(chalk.red("Error:"), err.message);
    logger.error("Error during push", { message: err.message });
  } else {
    // Handle completely unknown errors
    console.error(chalk.red("Unknown error occurred"));
    logger.error("Unknown error during push", { error: String(err) });
  }
}
