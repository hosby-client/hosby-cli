import OpenAI from "openai";
import inquirer from "inquirer";
import { filterProjectFiles } from "../helpers/codeFilter.js";
import { getCredentials, saveCredentials } from "./config.js";
import Anthropic from "@anthropic-ai/sdk";
import { AIProvider, AI_PROVIDERS, AnalyzeOptions, HosbySchema } from "../types/types.js";
import { fallbackPrompt, systemAIPrompt } from "../scripts/prompts.js";


/**
 * Analyzes a project with AI to generate a JSON schema
 * @param {string} scanPath - Path to the project to analyze
 * @param {AnalyzeOptions} [options] - Options for AI analysis including API key and timeout
 * @returns {Promise<HosbySchema>} Generated schema object
 * @throws {Error} If API key is missing, request times out, or token limit is exceeded
 */
export async function analyzeWithAI(
    scanPath: string,
    options: AnalyzeOptions = {}
): Promise<HosbySchema> {
    const timeout = options.timeout ?? 60000;

    let provider = options.provider;
    const savedProvider = await getCredentials("ai-provider") as AIProvider | null;

    if (!provider && savedProvider) {
        const { useSavedProvider } = await inquirer.prompt([
            {
                type: "confirm",
                name: "useSavedProvider",
                message: `Use your saved AI provider (${AI_PROVIDERS[savedProvider as AIProvider].name})?`,
                default: true,
            },
        ]);

        if (useSavedProvider) {
            provider = savedProvider;
            console.log(`🤖 Using your saved AI provider: ${AI_PROVIDERS[provider as AIProvider].name}`);
        }
    }

    if (!provider) {
        const { selectedProvider } = await inquirer.prompt([
            {
                type: "list",
                name: "selectedProvider",
                message: "Select an AI provider to use:",
                choices: Object.entries(AI_PROVIDERS).map(([id, config]) => ({
                    name: config.name,
                    value: id
                })),
                default: "openai",
            },
        ]);

        provider = selectedProvider as AIProvider;

        const { saveProvider } = await inquirer.prompt([
            {
                type: "confirm",
                name: "saveProvider",
                message: `Would you like to save ${AI_PROVIDERS[provider as AIProvider].name} as your default AI provider?`,
                default: true,
            },
        ]);

        if (saveProvider) {
            await saveCredentials("ai-provider", provider);
            console.log(`✅ ${AI_PROVIDERS[provider as AIProvider].name} saved as your default AI provider`);
        }
    }

    const providerConfig = AI_PROVIDERS[provider];

    let apiKey = options.apiKey;

    if (!apiKey) {
        const savedKey = await getCredentials(providerConfig.credentialKey);

        if (savedKey) {
            const { useSaved } = await inquirer.prompt([
                {
                    type: "confirm",
                    name: "useSaved",
                    message: `Use your saved ${providerConfig.name} API key?`,
                    default: true,
                },
            ]);

            if (useSaved) {
                apiKey = savedKey;
                console.log(`🔑 Using your saved ${providerConfig.name} API key`);
            }
        }

        if (!apiKey) {
            apiKey = process.env[providerConfig.envVarName];

            if (!apiKey) {
                console.log("\n┌" + "─".repeat(60) + "┐");
                console.log("│" + " ".repeat(60) + "│");
                console.log(`│  ⚠️  You need to provide a ${providerConfig.name} API key to continue.  │`);
                console.log("│" + " ".repeat(60) + "│");
                console.log("└" + "─".repeat(60) + "┘\n");

                const { key, saveKey } = await inquirer.prompt([
                    {
                        type: "input",
                        name: "key",
                        message: `Enter your ${providerConfig.name} API key:`,
                        validate: providerConfig.validateKey,
                    },
                    {
                        type: "confirm",
                        name: "saveKey",
                        message: "Would you like to save this API key for future use?",
                        default: true,
                    },
                ]);

                apiKey = key;

                if (saveKey && apiKey) {
                    await saveCredentials(providerConfig.credentialKey, apiKey);
                    console.log(`✅ ${providerConfig.name} API key saved successfully`);
                }
            }
        }
    }

    if (!apiKey) {
        throw new Error(`No API key provided. Set ${providerConfig.envVarName} environment variable or provide apiKey option.`);
    }

    console.log("🔍 Analyzing project files...");

    const filterResult = await filterProjectFiles(scanPath, {
        maxFileSize: 50 * 1024,  // 50KB per file max
        maxFiles: 30,            // Max 30 files
        maxTotalSize: 300 * 1024, // 300KB total content max
        includeComments: false,   // Skip comments
        includeImports: true      // Keep imports for context
    });

    console.log(`📊 Selected ${filterResult.selectedFiles.length} business logic files (${Math.round(filterResult.totalSize / 1024)}KB, ~${filterResult.estimatedTokens} tokens)`);

    if (filterResult.estimatedTokens > 120000) {
        console.warn("⚠️ Warning: Project size may exceed token limits. Consider using a smaller project or fewer files.");
    }

    const projectContent = filterResult.content;

    // Fetch the system prompt from the server or use fallback if unavailable
    console.log("📡 Fetching AI system prompt...");

    let systemPrompt;
    if (options.customSystemPrompt) {
        systemPrompt = options.customSystemPrompt;
    } else {
        try {
            systemPrompt = systemAIPrompt;
        } catch (error) {
            console.warn("Could not fetch system prompt, using fallback prompt");
            systemPrompt = fallbackPrompt;
        } finally {
            // Added finally block to close the try-catch block
        }
    }

    const userPrompt = `
        Scan this project and generate the JSON schema focusing ONLY on data models and business entities.
        Completely ignore UI components, props interfaces, and presentation logic.
        Analyze this code:${projectContent}
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        console.log(`🤖 Sending request to ${AI_PROVIDERS[provider as AIProvider].name} model (timeout: ${timeout / 1000}s)...`);

        let text = "";

        if (provider === "openai") {

            const client = new OpenAI({ apiKey });
            const response = await client.chat.completions.create({
                model: AI_PROVIDERS[provider as AIProvider].defaultModel,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0,
                max_tokens: 4000,
                response_format: { type: "json_object" }
            }, { signal: controller.signal });

            text = response.choices[0].message?.content ?? "";

        } else if (provider === "claude") {

            const client = new Anthropic({ apiKey });
            const response = await client.messages.create({
                model: AI_PROVIDERS[provider as AIProvider].defaultModel,
                system: systemPrompt,
                messages: [
                    { role: "user", content: userPrompt }
                ],
                temperature: 0,
                max_tokens: 4000
            }, { signal: controller.signal });

            if (response.content && response.content.length > 0 && 'text' in response.content[0]) {
                text = response.content[0].text;
            } else {
                throw new Error("Unexpected response format from Claude AI");
            }

        } else {
            throw new Error(`Unsupported AI provider: ${provider}`);
        }

        clearTimeout(timeoutId);
        let schema;

        try {
            schema = JSON.parse(text);
            console.log("✅ Successfully parsed AI response as JSON");
        } catch (err) {
            console.error("❌ Failed to parse AI response as JSON");
            console.error("Response content:", text.substring(0, 100) + "...");

            schema = { tables: {} };
            throw new Error("Failed to parse AI response as JSON. The AI may have returned invalid JSON format.");
        }
        if (!schema.tables) {
            console.warn("⚠️ AI response missing 'tables' property, adding empty tables object");
            schema.tables = {};
        }

        if (Object.keys(schema.tables).length === 0) {
            console.warn("⚠️ AI generated an empty schema. No tables were identified in the project.");
        }

        return schema;
    } catch (err: unknown) {
        const error = err as Error & { code?: string };
        if (error.name === "AbortError") {
            throw new Error(`AI analysis timed out after ${timeout / 1000} seconds. Try with fewer files or a smaller project.`);
        } else if (error.code === "context_length_exceeded" || error.message?.includes("maximum context length")) {
            throw new Error("The project is too large for AI analysis. Try with fewer files or a smaller project.");
        } else if (error.code === "rate_limit_exceeded") {
            throw new Error(`${AI_PROVIDERS[provider as AIProvider].name} rate limit exceeded. Please try again later or use a different API key.`);
        } else if (error.code === "invalid_api_key" || error.message?.includes("invalid api key")) {
            throw new Error(`Invalid ${AI_PROVIDERS[provider as AIProvider].name} API key. Please check your API key and try again.`);
        } else {
            console.error("AI analysis error details:", error);
            throw new Error(`AI analysis failed: ${error.message || 'Unknown error'}`);
        }
    } finally {
        clearTimeout(timeoutId);
    }
}
