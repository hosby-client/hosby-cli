import fs from "fs";
import path from "path";
import ora from "ora";
import logger from "../helpers/logger.js";
import { filterSchema, sanitizeSchema } from "../helpers/filterSchema.js";
import { HosbySchema } from "../types/types.js";

/**
 * Processes and filters the schema
 * @param {any} schema - The schema to process
 * @param {any} filteredSchema - The filtered schema
 * @param {Object} schemaStats - The schema statistics
 * @param {ReturnType<typeof ora>} spinner - The spinner instance
 * @param {string} scanPath - The path to the scan directory
 */
export function processAndFilterSchema(
  schema: HosbySchema,
  filteredSchema: HosbySchema,
  schemaStats: { tableCount: number; columnCount: number },
  spinner: ReturnType<typeof ora>,
  scanPath: string
): void {
  try {
    spinner.text = "📝 Sanitizing and filtering schema...";
    schema = sanitizeSchema(schema);
    filteredSchema = filterSchema(schema);

    if (!filteredSchema.tables || Object.keys(filteredSchema.tables).length === 0) {
      spinner.warn("⚠️ No tables found in schema. The generated schema may be empty.");
      // Restart spinner after warning
      spinner.start();
    }

    // Step 4: Save schema to file
    spinner.text = "💾 Saving schema to file...";
    const schemaPath = path.join(scanPath, "hosby.schema.json");

    try {
      fs.writeFileSync(schemaPath, JSON.stringify(filteredSchema, null, 2));

      schemaStats.tableCount = Object.keys(filteredSchema.tables).length;
      schemaStats.columnCount = Object.values(filteredSchema.tables).reduce(
        (sum: number, table) => sum + Object.keys(table as Record<string, unknown>).length,
        0
      );

      spinner.succeed(`Schema generated successfully: ${schemaPath} ! 🎉`);
      // Restart spinner after succeed message
      spinner.start();
    } catch (error) {
      logger.error("Error writing schema to file", error);
      spinner.fail(`Failed to write schema to ${schemaPath}`);
      return;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    spinner.fail(`Failed to process schema: ${errorMessage}`);
    return;
  }
}
