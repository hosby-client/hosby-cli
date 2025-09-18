import { scanProject } from "../scripts/schema.js";
import fs from "fs";
import path from "path";
import ora from "ora";
import inquirer from "inquirer";
import { analyzeWithAI } from "../core/ai.js";
import logger from "../helpers/logger.js";
import { hosbyContentClientPrompt } from "../scripts/prompts.js";
import { createService } from "./create-service.js";
import { validateScanPath } from "../helpers/utils.js";
import { ensureHosbyTsInstalled, installHosbyTs } from "../scripts/ensureHosbyTsInstalled.js";
import { AIProvider } from "../types/types.js";
import { processAndFilterSchema } from "../scripts/processAndFilterSchema.js";

interface ScanOptions {
    ai?: boolean;
    timeout?: number;
    provider?: string;
}

/**
 * Scans a project directory and generates a schema
 * @param {string} scanPath - Path to scan for project files
 * @param {ScanOptions} options - Scan options
 */
export async function scan(scanPath: string = ".", options?: ScanOptions): Promise<void> {
    if (!validateScanPath(scanPath)) {
        return;
    }

    const useAI = options?.ai ?? false;
    let schema: Record<string, unknown>;
    const filteredSchema: Record<string, unknown> = {};
    const schemaStats = { tableCount: 0, columnCount: 0 };

    const spinner = ora("🔹 Analyzing project...").start();

    try {
        spinner.text = "🔍 Checking for hosby-ts installation...";
        const isInstalled = await ensureHosbyTsInstalled();

        if (!isInstalled) {
            spinner.info("📚 hosby-ts not found. Will install after schema generation.");
        } else {
            spinner.succeed("hosby-ts is already installed.");
            spinner.start();
        }

        if (useAI) {
            spinner.stop();
            console.log("🤖 Analyzing project with AI...");

            try {
                const provider = options?.provider as AIProvider | undefined;

                schema = await analyzeWithAI(scanPath, {
                    timeout: options?.timeout || 60000,
                    provider
                });

                if (!schema || typeof schema !== "object") {
                    console.error("❌ AI analysis did not return a valid schema.");
                    return;
                }

                console.log("✔ AI analysis completed successfully. 🚀");
                spinner.start("Processing schema...");
            } catch (error: unknown) {
                console.error(`❌ AI analysis failed: ${(error as Error)?.message || 'Unknown error'}`);
                return;
            }
        } else {
            spinner.text = "🔍 Scanning project with TypeScript analyzer...";

            try {
                schema = await scanProject(scanPath);
                spinner.succeed("Project scan completed successfully. 🚀");
                spinner.start();
            } catch (error: unknown) {
                spinner.fail(`❌ Project scan failed: ${(error as Error)?.message || 'Unknown error'}`);
                return;
            }
        }

        //Process and filter schema
        processAndFilterSchema(schema, filteredSchema, schemaStats, spinner, scanPath);

        //Install hosby-ts if needed
        if (!isInstalled) {
            await installHosbyTs(spinner);
            spinner.start();
        }

        //Generate Hosby client
        spinner.text = "📄 Generating Hosby client...";
        const libDir = path.join(process.cwd(), "src", "api");
        if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });

        const clientFile = path.join(libDir, "hosbyClient.ts");
        const clientContent = hosbyContentClientPrompt;

        try {
            fs.writeFileSync(clientFile, clientContent, "utf-8");
            spinner.succeed(`Client Hosby generated: ${clientFile} ! 🎉`);
        } catch (error: unknown) {
            spinner.fail(`Failed to generate client: ${(error as Error)?.message || 'Unknown error'}`);
            return;
        }

        //Display schema statistics
        if (filteredSchema && filteredSchema.tables) {
            const removedCount = Object.keys(schema.tables as Record<string, unknown>).length - Object.keys(filteredSchema.tables as Record<string, unknown>).length;
            if (removedCount > 0) {
                console.log(`\n ✔ Filtered out ${removedCount} UI component tables from schema`);
            }

            if (schemaStats.tableCount > 0) {
                logger.info(`Schema statistics: ${schemaStats.tableCount} Tables with ${schemaStats.columnCount} Fields`);

                const tableDetails = Object.entries(filteredSchema.tables).map(([tableName, columns]) => {
                    const columnCount = Object.keys(columns as Record<string, unknown>).length;
                    return `${tableName} (${columnCount} Fields)`;
                }).join(', ');

                logger.info(`Tables: ${tableDetails}`);

                //Handle service generation
                if (Object.keys(filteredSchema.tables).length > 0) {
                    spinner.stop();

                    const { generateServices } = await inquirer.prompt([
                        {
                            type: "confirm",
                            name: "generateServices",
                            message: "Would you like to generate CRUD service modules for these tables?",
                            default: false
                        }
                    ]);

                    if (generateServices) {
                        const { generateForAll } = await inquirer.prompt([
                            {
                                type: "confirm",
                                name: "generateForAll",
                                message: "Generate services for all tables? (No will let you select specific tables)",
                                default: true
                            }
                        ]);

                        let selectedTables: string[] = [];

                        if (generateForAll) {
                            selectedTables = Object.keys(filteredSchema.tables);
                        } else {
                            const result = await inquirer.prompt([
                                {
                                    type: "checkbox",
                                    name: "selectedTables",
                                    message: "Select tables to generate services for:",
                                    choices: Object.keys(filteredSchema.tables).map(name => ({
                                        name,
                                        value: name
                                    })),
                                    validate: (answer: string[]) => {
                                        if (answer.length < 1) {
                                            return "You must choose at least one table";
                                        }
                                        return true;
                                    }
                                }
                            ]);
                            selectedTables = result.selectedTables;
                        }

                        if (selectedTables && selectedTables.length > 0) {
                            const serviceSpinner = ora(`Generating CRUD services for ${selectedTables.length} tables...`).start();

                            try {
                                let allSuccessful = true;
                                for (const tableName of selectedTables) {
                                    const success = await createService(tableName);
                                    if (!success) {
                                        allSuccessful = false;
                                    }
                                }

                                if (allSuccessful) {
                                    serviceSpinner.succeed("CRUD services generated successfully! 🎉");
                                } else {
                                    serviceSpinner.warn("Some services were not generated successfully. Check the logs for details.");
                                }
                            } catch (error: unknown) {
                                serviceSpinner.fail(`Failed to generate services: ${(error as Error)?.message || 'Unknown error'}`);
                            }
                        }
                    }
                }
            }
        }
    } catch (err: unknown) {
        spinner.fail("Error during project scan");
        
        const error = err as { code?: string; path?: string; message?: string };
        if (error.code === "ENOENT") {
            console.error(`File not found: ${error.path || 'Unknown path'}`);
        } else if (error.code === "EACCES") {
            console.error(`Permission denied: ${error.path || 'Unknown path'}`);
        } else if (error.message?.includes("token")) {
            console.error("AI token limit exceeded. Try scanning a smaller project or use non-AI scan.");
        } else {
            console.error("Error details:", error.message || err);
        }

        console.error("\nTry running the scan with more specific options or on a smaller directory.");
    }
}
