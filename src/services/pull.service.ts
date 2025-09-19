import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import fs from "fs";
import { Ora } from "ora";
import inquirer from "inquirer";
import chalk from "chalk";
import logger from "../helpers/logger.js";
import { API_BASE_URL } from "../config/config.js";
import { createAuthHeaders } from "../core/auth.js";
import { getSchemaHash, hasLocalChanges } from "../helpers/utils.js";
import {
    ConflictAction,
    LastPullData,
    SchemaData,
    ServerResponse,
    AuthCredentials,
    ProjectCredentials
} from "../types/types.js";

const API_TIMEOUT = 30000;

/**
 * Gets local schema information including schema data, hash, and last pull time
 * @param {string} schemaFile - Path to the schema file
 * @param {string} lastPullTimeFile - Path to the last pull time file
 * @returns {Promise<{schemaData: SchemaData, localSchemaHash: string, lastPullTime: Date}>}
 */
export async function getLocalSchemaInfo(schemaFile: string, lastPullTimeFile: string): Promise<{
    schemaData: SchemaData;
    localSchemaHash: string;
    lastPullTime: Date;
}> {
    const schemaData: SchemaData = JSON.parse(fs.readFileSync(schemaFile, "utf-8"));
    const localSchemaHash = getSchemaHash(schemaData);

    let lastPullTime = new Date(0);
    try {
        if (fs.existsSync(lastPullTimeFile)) {
            const lastPullData: LastPullData = JSON.parse(fs.readFileSync(lastPullTimeFile, "utf-8"));
            lastPullTime = new Date(lastPullData.time);
            logger.debug(`Last pull was at ${lastPullTime.toISOString()}`);
        }
    } catch (err) {
        logger.warn("Could not read last pull time", err);
    }

    return { schemaData, localSchemaHash, lastPullTime };
}


/**
 * Fetches schema from the server
 * @param {AuthCredentials} credentials - User authentication credentials
 * @param {ProjectCredentials} projectCredentials - Project credentials
 * @param {SchemaData} schemaData - Local schema data
 * @param {string} localSchemaHash - Hash of the local schema
 * @param {Date} lastPullTime - Last pull time
 * @returns {Promise<AxiosResponse<ServerResponse>>} Server response
 */
export async function fetchServerSchema(
    authCredentials: AuthCredentials,
    projectCredentials: ProjectCredentials,
    localSchemaHash: string,
    lastPullTime?: Date
): Promise<AxiosResponse<ServerResponse>> {
    const axiosConfig: AxiosRequestConfig = {
        ...createAuthHeaders(authCredentials),
        timeout: API_TIMEOUT
    };

    const url = `${API_BASE_URL}/projects/${projectCredentials.id}/pull`;

    logger.debug("Sending request to server", { url, schemaHash: localSchemaHash });
    const response = await axios.get(url, {
        params: {
            schemaHash: localSchemaHash,
            lastPullTime: lastPullTime?.toISOString()
        },
        ...axiosConfig
    });

    // Log the response for debugging
    logger.debug("Server response received", {
        status: response.status,
        hasSchema: !!response.data?.schema,
        hasNestedSchema: !!response.data?.data?.schema,
        responseData: JSON.stringify(response.data).substring(0, 200) + "..."
    });

    return response;
}

/**
 * Processes the server response and handles schema updates
 * @param {AxiosResponse<ServerResponse>} response - Server response
 * @param {SchemaData} schemaData - Local schema data
 * @param {string} localSchemaHash - Hash of the local schema
 * @param {string} schemaFile - Path to the schema file
 * @param {string} lastPullTimeFile - Path to the last pull time file
 * @param {Ora} spinner - Ora spinner instance
 * @param {Date} lastPullTime - Last pull time
 * @returns {Promise<void>}
 */
export async function processServerResponse(
    response: AxiosResponse<ServerResponse>,
    schemaData: SchemaData,
    localSchemaHash: string,
    schemaFile: string,
    lastPullTimeFile: string,
    spinner: Ora,
    lastPullTime: Date
): Promise<void> {
    const serverSchema = response.data.schema || response.data.data?.schema;
    if (!serverSchema) {
        spinner.succeed("✅ Pull completed. No schema updates available.");
        logger.info("No schema updates available from server");
        return;
    }

    const serverSchemaHash = getSchemaHash(serverSchema);
    const hasChanges = serverSchemaHash !== localSchemaHash;

    const hasLocalMods = hasLocalChanges(schemaFile, lastPullTime);

    const isUpdated = response.data.data?.updated === true;

    if ((isUpdated || hasChanges) && hasLocalMods) {
        await handleSchemaConflicts(spinner, schemaData, serverSchema, schemaFile);
    } else if (isUpdated || hasChanges) {
        updateSchemaFile(schemaFile, serverSchema);
        spinner.succeed("🚀 Pull completed successfully! Schema updated.");
        logger.info("Schema updated from server");
    } else {
        spinner.succeed("✅ Pull completed. Schema is already up to date.");
        logger.info("Schema is already up to date");
    }

    updateLastPullTime(lastPullTimeFile, serverSchemaHash || localSchemaHash);
}

/**
 * Handles schema conflicts between local and server versions
 * @param {Ora} spinner - Ora spinner instance
 * @param {SchemaData} localSchema - Local schema data
 * @param {SchemaData} serverSchema - Server schema data
 * @param {string} schemaFile - Path to the schema file
 * @returns {Promise<void>}
 */
export async function handleSchemaConflicts(
    spinner: Ora,
    localSchema: SchemaData,
    serverSchema: SchemaData,
    schemaFile: string
): Promise<void> {
    spinner.stop();
    logger.warn("Conflict detected: Both local and server schemas have changed");

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Both local and server schemas have changed. How would you like to proceed?',
        choices: [
            { name: 'Use server version (overwrite local changes)', value: ConflictAction.SERVER },
            { name: 'Keep local version (reject server changes)', value: ConflictAction.LOCAL },
            { name: 'Merge changes (server has priority for conflicts)', value: ConflictAction.MERGE },
            { name: 'View differences before deciding', value: ConflictAction.DIFF }
        ]
    }]);

    if (action === ConflictAction.DIFF) {
        await handleDiffView(spinner, localSchema, serverSchema, schemaFile);
    } else {
        await resolveConflict(action, spinner, localSchema, serverSchema, schemaFile);
    }
}

/**
 * Handles the diff view option for conflict resolution
 * @param {Ora} spinner - Ora spinner instance
 * @param {SchemaData} localSchema - Local schema data
 * @param {SchemaData} serverSchema - Server schema data
 * @param {string} schemaFile - Path to the schema file
 * @returns {Promise<void>}
 */
export async function handleDiffView(
    spinner: Ora,
    localSchema: SchemaData,
    serverSchema: SchemaData,
    schemaFile: string
): Promise<void> {
    console.log(chalk.cyan('\n=== Server Schema (excerpt) ==='));
    console.log(JSON.stringify(serverSchema, null, 2).substring(0, 500) + '...');
    console.log(chalk.yellow('\n=== Local Schema (excerpt) ==='));
    console.log(JSON.stringify(localSchema, null, 2).substring(0, 500) + '...');

    const { secondAction } = await inquirer.prompt([{
        type: 'list',
        name: 'secondAction',
        message: 'How would you like to proceed?',
        choices: [
            { name: 'Use server version', value: ConflictAction.SERVER },
            { name: 'Keep local version', value: ConflictAction.LOCAL },
            { name: 'Merge changes (server has priority)', value: ConflictAction.MERGE }
        ]
    }]);

    await resolveConflict(secondAction, spinner, localSchema, serverSchema, schemaFile);
}

/**
 * Resolves schema conflicts based on the chosen action
 * @param {ConflictAction} action - Chosen conflict resolution action
 * @param {Ora} spinner - Ora spinner instance
 * @param {SchemaData} localSchema - Local schema data
 * @param {SchemaData} serverSchema - Server schema data
 * @param {string} schemaFile - Path to the schema file
 * @returns {Promise<void>}
 */
export async function resolveConflict(
    action: ConflictAction,
    spinner: Ora,
    localSchema: SchemaData,
    serverSchema: SchemaData,
    schemaFile: string
): Promise<void> {
    if (action === ConflictAction.LOCAL) {
        spinner.succeed("🛑 Pull operation completed. Local schema preserved.");
        logger.info("User chose to keep local schema");
    } else if (action === ConflictAction.MERGE) {
        const mergedSchema = mergeSchemas(localSchema, serverSchema);
        updateSchemaFile(schemaFile, mergedSchema);
        spinner.succeed("🔄 Pull completed with merge. Schema updated.");
        logger.info("Schemas merged successfully");
    } else {
        updateSchemaFile(schemaFile, serverSchema);
        spinner.succeed("🚀 Pull completed. Local schema replaced with server version.");
        logger.info("Local schema replaced with server version");
    }
}

/**
 * Merges local and server schemas
 * @param {SchemaData} localSchema - Local schema data
 * @param {SchemaData} serverSchema - Server schema data
 * @returns {SchemaData} Merged schema
 */
export function mergeSchemas(localSchema: SchemaData, serverSchema: SchemaData): SchemaData {
    return {
        ...localSchema,
        ...serverSchema,
        tables: {
            ...localSchema.tables,
            ...serverSchema.tables
        }
    };
}

/**
 * Updates the schema file with new schema data while preserving metadata
 * @param {string} schemaFile - Path to the schema file
 * @param {SchemaData} schema - Schema data to write
 */
export function updateSchemaFile(schemaFile: string, schema: SchemaData): void {
    let existingMetadata = {};

    // Try to read existing schema to preserve metadata
    try {
        if (fs.existsSync(schemaFile)) {
            const existingSchema: SchemaData = JSON.parse(fs.readFileSync(schemaFile, "utf-8"));
            if (existingSchema.metadata) {
                existingMetadata = existingSchema.metadata;
            }
        }
    } catch (err) {
        logger.debug("Could not read existing schema metadata", err);
    }

    // Preserve metadata in the new schema
    const updatedSchema = {
        ...schema,
        metadata: schema.metadata || existingMetadata
    };

    fs.writeFileSync(schemaFile, JSON.stringify(updatedSchema, null, 2), "utf-8");
}

/**
 * Updates the last pull time file
 * @param {string} lastPullTimeFile - Path to the last pull time file
 * @param {string} schemaHash - Hash of the schema
 */
export function updateLastPullTime(lastPullTimeFile: string, schemaHash: string): void {
    const lastPullData: LastPullData = {
        time: new Date().toISOString(),
        hash: schemaHash
    };
    fs.writeFileSync(lastPullTimeFile, JSON.stringify(lastPullData), "utf-8");
}

/**
 * Handles errors that occur during the pull operation
 * @param {Error} err - Error object
 * @param {Ora} spinner - Ora spinner instance
 */
export function handlePullError(err: Error & { 
    code?: string;
    response?: { 
        status?: number; 
        statusText?: string; 
        data?: unknown;
    };
}, spinner: Ora): void {
    spinner.fail("❌ Error during pull operation");
    logger.error("Pull operation failed", err);

    if (err.code === "ECONNABORTED") {
        console.error(chalk.red("Request timed out. Please check your internet connection and try again."));
        logger.error("Request timeout", { timeout: `${API_TIMEOUT}ms` });
    } else if (err.response?.status === 401) {
        console.error(chalk.red("Authentication failed. Please run 'hosby login' to refresh your credentials."));
        logger.error("Authentication failed", {
            status: err.response?.status,
            statusText: err.response?.statusText
        });
    } else if (err.response?.data) {
        console.error(chalk.red("Server error:"), err.response.data);
        logger.error("Server error response", {
            status: err.response?.status,
            data: err.response?.data
        });
    } else {
        console.error(chalk.red("Error:"), err.message || err);
        logger.error("Unknown error", { message: err.message });
    }
}
