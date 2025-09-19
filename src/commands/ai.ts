import inquirer from "inquirer";
import { analyzeWithAI } from "../core/ai.js";
import { getCredentials } from "../core/config.js";
import { AIProvider } from "../types/types.js";

export async function ai(): Promise<void> {
  console.log("🤖 Starting AI analysis...");

  const scanPath = process.cwd();

  try {
    const savedProvider = (await getCredentials("ai-provider")) as AIProvider | null;

    const { useSpecificProvider } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useSpecificProvider",
        message: "Would you like to select a specific AI provider for this analysis?",
        default: false,
      },
    ]);

    let provider: AIProvider | undefined = undefined;

    if (useSpecificProvider) {
      const { selectedProvider } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedProvider",
          message: "Select an AI provider to use:",
          choices: [
            { name: "OpenAI", value: "openai" },
            { name: "Claude AI", value: "claude" },
          ],
          default: savedProvider || "openai",
        },
      ]);

      provider = selectedProvider as AIProvider;
    }

    const schema = await analyzeWithAI(scanPath, { provider });
    console.log("✅ AI analysis completed successfully!");
    console.log(`📊 Generated schema with ${Object.keys(schema.tables || {}).length} tables.`);
  } catch (error: unknown) {
    console.error(
      `❌ AI analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
