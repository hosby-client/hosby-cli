import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import logger from "../helpers/logger.js";
import { analyzeWithAI } from "../core/ai.js";
import { AIProvider } from "../types/types.js";
import {
  generateServiceFromTemplate,
  cleanupAndSucceed,
  cleanupAndFail,
} from "../helpers/utils.js";
import { generateServiceWithAIprompt } from "../scripts/prompts.js";
import { SimpleSpinner } from "../types/types.js";

/**
 * Validates schema and gets the table name
 * @param tableName - Optional table name
 * @returns Object with validation status, schema and valid table name
 */
export async function validateAndGetTable(tableName?: string): Promise<{
  isValid: boolean;
  schema: Record<string, unknown>;
  validTableName?: string;
}> {
  const schemaPath = path.join(process.cwd(), "hosby.schema.json");
  if (!fs.existsSync(schemaPath)) {
    logger.error("Schema file not found. Run 'hosby scan' first to generate a schema.");
    return { isValid: false, schema: {} as Record<string, unknown> };
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

  if (!schema.tables || Object.keys(schema.tables).length === 0) {
    logger.error("No tables found in schema. Run 'hosby scan' first.");
    return { isValid: false, schema };
  }

  if (!tableName) {
    const tables = Object.keys(schema.tables);
    const { selectedTable } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedTable",
        message: "Select a table to generate a service for:",
        choices: tables,
      },
    ]);
    tableName = selectedTable;
  } else if (!schema.tables[tableName]) {
    logger.error(`Table '${tableName}' not found in schema.`);
    return { isValid: false, schema };
  }

  return { isValid: true, schema, validTableName: tableName };
}

/**
 * Generates service code using AI or template
 * @param useAI - Whether to use AI
 * @param tableName - Name of the table
 * @param tableSchema - Schema of the table
 * @param servicesDir - Directory to save the service
 * @param spinner - Spinner for visual feedback
 * @param spinnerUpdateInterval - Interval ID for spinner updates
 * @returns Boolean indicating success
 */
export async function generateService(
  useAI: boolean,
  tableName: string,
  tableSchema: Record<string, unknown>,
  servicesDir: string,
  spinner: SimpleSpinner,
  spinnerUpdateInterval: NodeJS.Timeout
): Promise<boolean> {
  if (useAI) {
    return await generateWithAI(
      tableName,
      tableSchema,
      servicesDir,
      spinner,
      spinnerUpdateInterval
    );
  } else {
    return generateWithTemplate(
      tableName,
      tableSchema,
      servicesDir,
      spinner,
      spinnerUpdateInterval
    );
  }
}

/**
 * Generates service using AI with timeout
 * @param tableName - Name of the table
 * @param tableSchema - Schema of the table
 * @param servicesDir - Directory to save the service
 * @param spinner - Spinner for visual feedback
 * @param spinnerUpdateInterval - Interval ID for spinner updates
 * @returns Boolean indicating success
 */
export async function generateWithAI(
  tableName: string,
  tableSchema: Record<string, unknown>,
  servicesDir: string,
  spinner: SimpleSpinner,
  spinnerUpdateInterval: NodeJS.Timeout
): Promise<boolean> {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("AI service generation timed out after 45 seconds")), 45000);
  });

  try {
    await Promise.race([
      generateServiceWithAI(tableName, tableSchema).then(serviceCode => {
        fs.writeFileSync(path.join(servicesDir, `${tableName}.service.ts`), serviceCode);
      }),
      timeoutPromise,
    ]);

    cleanupAndSucceed(
      spinner,
      spinnerUpdateInterval,
      `Service for ${tableName} generated successfully with AI.`
    );
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes("timed out")) {
      spinner.text = `AI generation timed out, using template instead...`;
      logger.info("Falling back to template-based generation...");

      return generateWithTemplate(
        tableName,
        tableSchema,
        servicesDir,
        spinner,
        spinnerUpdateInterval,
        true
      );
    } else {
      cleanupAndFail(
        spinner,
        spinnerUpdateInterval,
        `Failed to generate service with AI: ${err.message}`
      );
      return false;
    }
  }
}

/**
 * Generates service using template
 * @param tableName - Name of the table
 * @param tableSchema - Schema of the table
 * @param servicesDir - Directory to save the service
 * @param spinner - Spinner for visual feedback
 * @param spinnerUpdateInterval - Interval ID for spinner updates
 * @param isFallback - Whether this is a fallback from AI
 * @returns Boolean indicating success
 */
export function generateWithTemplate(
  tableName: string,
  tableSchema: Record<string, unknown>,
  servicesDir: string,
  spinner: SimpleSpinner,
  spinnerUpdateInterval: NodeJS.Timeout,
  isFallback: boolean = false
): boolean {
  try {
    const serviceCode = generateServiceFromTemplate(tableName, tableSchema);
    fs.writeFileSync(path.join(servicesDir, `${tableName}.service.ts`), serviceCode);

    cleanupAndSucceed(
      spinner,
      spinnerUpdateInterval,
      `Service for ${tableName} generated successfully using template.`
    );

    if (isFallback) {
      logger.info(`Template-based service for ${tableName} generated successfully.`);
      logger.info("You can edit the generated service file manually to customize it further.");
    }

    return true;
  } catch (error: unknown) {
    cleanupAndFail(
      spinner,
      spinnerUpdateInterval,
      `Failed to generate service with template: ${(error as Error).message}`
    );
    return false;
  }
}

/**
 * Generate a service using AI
 * @param tableName - Name of the table
 * @param tableSchema - Schema of the table
 * @returns Promise<string> - Generated service code
 */
export async function generateServiceWithAI(
  tableName: string,
  tableSchema: Record<string, unknown>
): Promise<string> {
  try {
    const prompt = generateServiceWithAIprompt(tableName, tableSchema);
    const provider = "openai" as AIProvider;
    const result = await analyzeWithAI(".", {
      timeout: 30000,
      provider,
      customSystemPrompt: prompt,
    });

    if (typeof result === "string") {
      return result;
    } else if (result && typeof result === "object") {
      return JSON.stringify(result, null, 2);
    } else {
      throw new Error("AI returned an unexpected response format");
    }
  } catch (error: unknown) {
    throw new Error(`AI service generation failed: ${(error as Error).message}`);
  }
}
