/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "fs";
import logger from "./logger.js";
import path from "path";
import ora, { Ora } from "ora";
import inquirer from "inquirer";
import { SimpleSpinner } from "../types/types.js";

/**
 * Prompts the user to choose whether to use AI
 * @returns Boolean indicating whether to use AI
 */
export async function promptForUsage(usageLabel: string, message: string, type?: string,): Promise<boolean> {
  const { [usageLabel]: response } = await inquirer.prompt([{
    type: type || "confirm",
    name: usageLabel,
    message: message,
    default: true
  }]);

  return response;
}


/**
 * Ensures that required directories exist
 * @returns Path to services directory
 */
export function ensureDirectories(): string {
  const srcDir = path.join(process.cwd(), "src");
  if (!fs.existsSync(srcDir)) {
    logger.warn("src directory not found, creating it...");
    fs.mkdirSync(srcDir);
  }

  const servicesDir = path.join(srcDir, "services");
  if (!fs.existsSync(servicesDir)) {
    logger.info("Creating services directory...");
    fs.mkdirSync(servicesDir);
  }

  return servicesDir;
}


/**
 * Starts the spinner for visual feedback
 * @param tableName - Name of the table
 * @returns Spinner and interval ID
 */
export function startSpinner(tableName: string): { spinner: Ora; spinnerUpdateInterval: NodeJS.Timeout } {
  const spinner = ora(`Generating service for ${tableName}...`).start();
  const spinnerUpdateInterval = setInterval(() => {
    spinner.text = `Still generating service for ${tableName}... (this may take a moment)`;
  }, 5000);

  return { spinner, spinnerUpdateInterval };
}


/**
 * Cleans up resources and logs failure
 * @param spinner - Spinner to update
 * @param interval - Interval to clear
 * @param message - Failure message
 */
export function cleanupAndFail(spinner: SimpleSpinner, interval: NodeJS.Timeout, message: string): void {
  clearInterval(interval);
  spinner.fail(message);
}

/**
 * Cleans up resources and logs error
 * @param spinner - Spinner to update
 * @param interval - Interval to clear
 * @param message - Error message for spinner
 * @param error - Error object for logger
 */
export function cleanupAndLogError(spinner: SimpleSpinner, interval: NodeJS.Timeout, message: string, error: Error): void {
  clearInterval(interval);
  spinner.fail(message);
  logger.error(`Error generating service: ${error.message}`);
}

/**
 * Cleans up resources and logs success
 * @param spinner - Spinner to update
 * @param interval - Interval to clear
 * @param message - Success message
 */
export function cleanupAndSucceed(spinner: SimpleSpinner, interval: NodeJS.Timeout, message: string): void {
  clearInterval(interval);
  spinner.succeed(message);
}


/**
 * Gets the last modified time of a schema file
 * @param {string} filePath - Path to the schema file
 * @returns {Date} Last modified date of the file
 */
export function getSchemaLastModified(filePath: string): Date {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime;
  } catch (err) {
    logger.error("Failed to get file stats", err);
    return new Date(0); // Return epoch if file doesn't exist or can't be accessed
  }
}

/**
 * Checks if the local schema has been modified since the last pull
 * @param {string} filePath - Path to the schema file
 * @param {Date} lastPullTime - Time of the last pull operation
 * @returns {boolean} True if the schema has been modified locally
 */
export function hasLocalChanges(filePath: string, lastPullTime: Date): boolean {
  const lastModified = getSchemaLastModified(filePath);
  return lastModified > lastPullTime;
}

/**
 * Checks if the schema file exists before pushing
 * @returns {boolean} True if schema file exists
 */
export function checkSchemaExists(): boolean {
  const schemaFile = path.join(process.cwd(), "hosby.schema.json");
  if (!fs.existsSync(schemaFile)) {
    console.error("❌ No hosby.schema.json found. Please run `hosby scan` first.");
    logger.error("Schema file not found", { path: schemaFile });
    return false;
  }
  logger.debug("Schema file found", { path: schemaFile });
  return true;
}

/**
 * Calculates a hash of the schema content for comparison
 * @param {object} schema - The schema object
 * @returns {string} A hash string representing the schema content
 */
export function getSchemaHash(schema: Record<string, unknown>): string {
  const stableJson = JSON.stringify(schema, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce<Record<string, any>>((sorted, key) => {
        sorted[key] = value[key];
        return sorted;
      }, {});
    }
    return value;
  });

  let hash = 5381;
  for (let i = 0; i < stableJson.length; i++) {
    hash = ((hash << 5) + hash) + stableJson.charCodeAt(i);
  }

  return (hash & 0x7FFFFFFF).toString(36);
}

/**
 * Validates the scan path to ensure it exists and is accessible
 * @param {string} scanPath - Path to scan for project files
 * @returns {boolean} True if path is valid
 * @throws {Error} If path is invalid or inaccessible
 */
export function validateScanPath(scanPath: string): boolean {
  try {
    if (!fs.existsSync(scanPath)) {
      logger.error(`Path does not exist: ${scanPath}`);
      return false;
    }
    const stats = fs.statSync(scanPath);
    if (!stats.isDirectory()) {
      logger.error(`Path is not a directory: ${scanPath}`);
      return false;
    }
    logger.debug(`Validated scan path: ${scanPath}`);
    return true;
  } catch (error) {
    logger.error(`Error accessing path: ${scanPath}`, error);
    return false;
  }
}



/**
 * Determine TypeScript type from schema value
 * @param value - Schema value
 * @returns TypeScript type
 */
export function getTypeFromSchema(value: unknown): string {
  if (value === null || value === undefined) {
    return 'any';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'any[]';
    }
    return `${getTypeFromSchema(value[0])}[]`;
  }

  if (typeof value === 'object') {
    return 'Record<string, any>';
  }

  switch (typeof value) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'any';
  }
}

/**
 * Map TypeScript type to schema type
 * @param type - TypeScript type
 * @returns Schema type
 */
export function mapType(type: string): string {
  if (type.includes("string")) return "string";
  if (type.includes("number")) return "number";
  if (type.includes("boolean")) return "boolean";
  if (type.includes("Date")) return "date";
  if (type.includes("Array")) return "array";
  if (type.includes("Object")) return "object";
  return "string";
}


/**
 * Generate a service from a template
 * @param tableName - Name of the table
 * @param tableSchema - Schema of the table
 * @returns Generated service code
 */
export function generateServiceFromTemplate(tableName: string, tableSchema: Record<string, unknown>): string {
  const className = tableName.charAt(0).toUpperCase() + tableName.slice(1) + 'Service';
  const interfaceName = tableName.charAt(0).toUpperCase() + tableName.slice(1);

  const properties = Object.entries(tableSchema)
    .filter(([key]) => !['id', 'createdAt', 'updatedAt'].includes(key))
    .map(([key, value]) => {
      const type = getTypeFromSchema(value);
      return `  ${key}: ${type};`;
    }).join('\n');

  return `import { hosbyQuery } from '../api/hosbyClient';

/**
 * Interface for ${interfaceName} model
 */
export interface ${interfaceName} {
  id: string;
${properties}
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Service for managing ${tableName} data
 */
export class ${className} {
  private tableName = '${tableName}';
  
  /**
   * Create a new ${tableName} record
   * @param data - The data to create
   * @returns The created record
   */
  async create(data: Omit<${interfaceName}, 'id' | 'createdAt' | 'updatedAt'>): Promise<${interfaceName}> {
    try {
      const result = await hosbyQuery.insertOne(this.tableName, data);
      if (!result.success) {
        throw new Error(result.message || 'Failed to create ${tableName}');
      }
      return result.data as ${interfaceName};
    } catch (error: any) {
      throw new Error(\`Error creating ${tableName}: \${error.message}\`);
    }
  }
  
  /**
   * Get a ${tableName} by ID
   * @param id - The ID of the record to retrieve
   * @returns The found record or null if not found
   */
  async getById(id: string): Promise<${interfaceName} | null> {
    try {
      const result = await hosbyQuery.findById(this.tableName, [
        { field: 'id', value: id }
      ]);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get ${tableName}');
      }
      
      return result.data as ${interfaceName};
    } catch (error: any) {
      throw new Error(\`Error getting ${tableName}: \${error.message}\`);
    }
  }
  
  /**
   * Get all ${tableName} records
   * @param options - Query options like limit, skip, etc.
   * @returns Array of records
   */
  async getAll(options?: { limit?: number; skip?: number }): Promise<${interfaceName}[]> {
    try {
      const result = await hosbyQuery.find(this.tableName, [], options);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get ${tableName} records');
      }
      
      return result.data as ${interfaceName}[];
    } catch (error: any) {
      throw new Error(\`Error getting ${tableName} records: \${error.message}\`);
    }
  }
  
  /**
   * Update a ${tableName} record
   * @param id - The ID of the record to update
   * @param data - The data to update
   * @returns The updated record
   */
  async update(id: string, data: Partial<${interfaceName}>): Promise<${interfaceName}> {
    try {
      const result = await hosbyQuery.updateOne(
        this.tableName,
        data,
        [{ field: 'id', value: id }]
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update ${tableName}');
      }
      
      return result.data as ${interfaceName};
    } catch (error: any) {
      throw new Error(\`Error updating ${tableName}: \${error.message}\`);
    }
  }
  
  /**
   * Delete a ${tableName} record
   * @param id - The ID of the record to delete
   * @returns The deleted record
   */
  async delete(id: string): Promise<${interfaceName}> {
    try {
      const result = await hosbyQuery.deleteById(
        this.tableName,
        [{ field: 'id', value: id }]
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete ${tableName}');
      }
      
      return result.data as ${interfaceName};
    } catch (error: any) {
      throw new Error(\`Error deleting ${tableName}: \${error.message}\`);
    }
  }
  
  /**
   * Find ${tableName} records by filter
   * @param filter - Filter criteria
   * @param options - Query options
   * @returns Array of matching records
   */
  async find(filter: Partial<${interfaceName}>, options?: { limit?: number; skip?: number; populate?: string[] }): Promise<${interfaceName}[]> {
    try {
      // Convert filter object to query filters array
      const queryFilters = Object.entries(filter).map(([field, value]) => ({
        field,
        value
      }));
      
      const result = await hosbyQuery.find(this.tableName, queryFilters, options);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to find ${tableName} records');
      }
      
      return result.data as ${interfaceName}[];
    } catch (error: any) {
      throw new Error(\`Error finding ${tableName} records: \${error.message}\`);
    }
  }
}

// Export singleton instance
export const ${tableName}Service = new ${className}();
`;
}
