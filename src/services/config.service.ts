import inquirer from "inquirer";
import logger from "../helpers/logger.js";
import { AIProvider, AI_PROVIDERS } from "../types/types.js";
import { setProjectInfos, saveCredentials, getCredentials } from "../core/config.js";

/**
 * Configure project settings
 */
export async function configProject(): Promise<void> {
  const answers = await inquirer.prompt([
    { type: "input", name: "projectId", message: "Project ID:", required: true },
    { type: "input", name: "projectName", message: "Project Name:", required: true },
  ]);

  try {
    await setProjectInfos(answers.projectId, answers.projectName);

    logger.info("✅ Project configured successfully.");
    console.log("✅ Project configured successfully.");
  } catch (err) {
    logger.error("❌ Error configuring project:", err);
    console.error("❌ Error configuring project:", err);
  }
}

/**
 * Configure AI provider settings
 */
export async function configAI(): Promise<void> {
  try {
    // Get current AI provider if exists
    const currentProvider = (await getCredentials("ai-provider")) as AIProvider | null;

    // Select AI provider
    const { provider } = await inquirer.prompt([
      {
        type: "list",
        name: "provider",
        message: "Select an AI provider:",
        choices: Object.entries(AI_PROVIDERS).map(([id, config]) => ({
          name: config.name,
          value: id,
        })),
        default: currentProvider || "openai",
      },
    ]);

    // Get API key
    const currentKey = await getCredentials(AI_PROVIDERS[provider as AIProvider].credentialKey);
    const { apiKey } = await inquirer.prompt([
      {
        type: "input",
        name: "apiKey",
        message: `Enter your ${AI_PROVIDERS[provider as AIProvider].name} API Key:`,
        default: currentKey ? `${currentKey.slice(0, 80)}...` : undefined,
        validate: (input: string) => {
          const validation = AI_PROVIDERS[provider as AIProvider].validateKey(input);
          return validation === true ? true : validation;
        },
      },
    ]);

    // Save credentials
    await saveCredentials("ai-provider", provider);
    await saveCredentials(AI_PROVIDERS[provider as AIProvider].credentialKey, apiKey);

    logger.info(
      `✅ AI provider configured successfully: ${AI_PROVIDERS[provider as AIProvider].name}`
    );
    console.log(
      `✅ AI provider configured successfully: ${AI_PROVIDERS[provider as AIProvider].name}`
    );
  } catch (err) {
    logger.error("❌ Error configuring AI provider:", err);
    console.error("❌ Error configuring AI provider:", err);
  }
}
