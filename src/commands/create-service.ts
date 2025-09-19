import logger from "../helpers/logger.js";
import {
  startSpinner,
  cleanupAndLogError,
  promptForUsage,
  ensureDirectories,
} from "../helpers/utils.js";
import { generateService, validateAndGetTable } from "../services/create-service.service.js";

/**
 * Generate a CRUD service for a specific table
 * @param tableName - Name of the table to generate a service for
 * @returns Promise<boolean> - True if service was generated successfully, false otherwise
 */
export async function createService(tableName?: string): Promise<boolean> {
  try {
    // Validate schema and get table name
    const { isValid, schema, validTableName } = await validateAndGetTable(tableName);
    if (!isValid || !validTableName) return false;

    const servicesDir = ensureDirectories();

    const useAI = await promptForUsage(
      "useAI",
      "Would you like to use AI to generate this service?"
    );
    const { spinner, spinnerUpdateInterval } = startSpinner(validTableName);

    try {
      const tableSchema = (schema.tables as Record<string, unknown>)[validTableName];

      const response = await generateService(
        useAI,
        validTableName,
        tableSchema as Record<string, unknown>,
        servicesDir,
        spinner,
        spinnerUpdateInterval
      );

      return response;
    } catch (error: unknown) {
      const err = error as Error;
      cleanupAndLogError(
        spinner,
        spinnerUpdateInterval,
        `Failed to generate service: ${err.message}`,
        err
      );
      return false;
    }
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Error creating service: ${err.message}`);
    return false;
  }
}
