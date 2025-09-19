import path from "path";
import ora from "ora";
import chalk from "chalk";
import { createLogger } from "../helpers/logger.js";
import { checkSchemaExists } from "../helpers/utils.js";
import {
  getLocalSchemaInfo,
  authenticate,
  hasSchemaChanged,
  pushSchemaToServer,
  updateLastPushFile,
  handlePushError,
} from "../services/push.service.js";
import { getProjectInfos } from "../core/config.js";

const logger = createLogger("push");

/**
 * Pushes the local schema to the Hosby server
 * @description Uploads the local schema.json file to the Hosby server
 * @param {boolean} force - If true, push even if schema is unchanged
 * @returns {Promise<void>}
 */
export async function push(force = false): Promise<void> {
  if (!checkSchemaExists()) {
    logger.warn("No schema file found in the current directory");
    return;
  }

  const schemaFile = path.join(process.cwd(), "hosby.schema.json");
  const lastPushFile = path.join(process.cwd(), ".hosby-last-push");

  try {
    const { schemaData, schemaHash } = await getLocalSchemaInfo(schemaFile);

    const schemaChanged = await hasSchemaChanged(lastPushFile, schemaHash, force);
    if (!schemaChanged) {
      console.log(chalk.blue("ℹ️ Schema unchanged since last push. Use --force to push anyway."));
      return;
    }

    const credentials = await authenticate();
    const projectCredentials = await getProjectInfos();

    if (!projectCredentials) {
      logger.error("Failed to get project information");
      console.error(
        chalk.red("❌ Failed to get project information. Please check your project configuration.")
      );
      return;
    }

    const spinner = ora("🚀 Pushing schema to server...").start();

    const response = await pushSchemaToServer(
      credentials,
      projectCredentials,
      schemaData,
      schemaHash
    );

    updateLastPushFile(lastPushFile, schemaHash, projectCredentials.id);

    spinner.succeed("🚀 Push completed successfully!");
    logger.info("Schema pushed successfully", {
      id: projectCredentials.id,
      responseStatus: response.status,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const spinner = ora().fail("❌ Error during push operation");
    handlePushError(err, spinner);
  }
}
