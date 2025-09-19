import inquirer from "inquirer";
import { configProject } from "../services/config.service.js";
import { configAI } from "../services/config.service.js";

/**
 * Main config command that handles subcommands
 */
export async function config(type?: string): Promise<void> {
  if (!type) {
    // If no type is specified, ask user what they want to configure
    const { configType } = await inquirer.prompt([
      {
        type: "list",
        name: "configType",
        message: "What would you like to configure?",
        choices: [
          { name: "Project settings", value: "project" },
          { name: "AI provider", value: "ai" },
        ],
      },
    ]);

    type = configType;
  }

  switch (type) {
    case "project":
      await configProject();
      break;
    case "ai":
      await configAI();
      break;
    default:
      console.error("❌ Invalid configuration type. Use 'project' or 'ai'.");
      break;
  }
}
