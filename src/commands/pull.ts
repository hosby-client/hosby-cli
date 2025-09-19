import path from "path";
import ora from "ora";
import chalk from "chalk";
import { createLogger } from "../helpers/logger.js";
import { checkSchemaExists } from "../helpers/utils.js";
import {
  getLocalSchemaInfo,
  fetchServerSchema,
  processServerResponse,
  handlePullError,
} from "../services/pull.service.js";
import { getProjectInfos } from "../core/config.js";
import { requireLogin } from "../core/auth.js";

const logger = createLogger("pull");

/**
 * Pulls the latest schema from the Hosby server
 * @description Synchronizes the local schema with the server and updates client code
 * @returns {Promise<void>}
 */
export async function pull(): Promise<void> {
  if (!checkSchemaExists()) {
    logger.warn("No schema file found in the current directory");
    return;
  }

  const schemaFile = path.join(process.cwd(), "hosby.schema.json");
  const lastPullTimeFile = path.join(process.cwd(), ".hosby-last-pull");

  const { schemaData, localSchemaHash, lastPullTime } = await getLocalSchemaInfo(
    schemaFile,
    lastPullTimeFile
  );

  const credentials = await requireLogin();
  if (!credentials) return;

  const projectCredentials = await getProjectInfos();
  if (!projectCredentials) {
    logger.error("Failed to get project information");
    console.error(
      chalk.red("❌ Failed to get project information. Please check your project configuration.")
    );
    return;
  }

  const spinner = ora("🔹 Pulling latest schema from server...").start();

  try {
    const response = await fetchServerSchema(
      credentials,
      projectCredentials,
      localSchemaHash,
      lastPullTime
    );

    await processServerResponse(
      response,
      schemaData,
      localSchemaHash,
      schemaFile,
      lastPullTimeFile,
      spinner,
      lastPullTime
    );
  } catch (err: unknown) {
    handlePullError(err as Error, spinner);
  }
}
