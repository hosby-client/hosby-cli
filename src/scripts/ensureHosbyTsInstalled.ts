import { Ora } from "ora";
import fs from "fs";
import logger from "../helpers/logger.js";
import { execSync } from "child_process";

/**
 * Checks if hosby-ts is installed and installs it if missing
 * @returns {Promise<boolean>} True if hosby-ts is available
 * @throws {Error} If installation fails
 */
export async function ensureHosbyTsInstalled(): Promise<boolean> {
  try {
    logger.debug("Checking if hosby-ts is installed in the project");
    execSync("npm list hosby-ts", { stdio: "ignore" });
    logger.debug("hosby-ts is already installed");
    return true;
  } catch (e) {
    logger.info("hosby-ts library not found.");
    return false;
  }
}

/**
 * Installs hosby-ts using the appropriate package manager
 * @param {ReturnType<typeof ora>} spinner - Spinner instance for progress display
 * @throws {Error} If installation fails
 */
export async function installHosbyTs(spinner: Ora): Promise<void> {
  try {
    spinner.text = "Installing hosby-ts package...";
    const lockFiles = [
      { file: "yarn.lock", command: "yarn add hosby-ts" },
      { file: "pnpm-lock.yaml", command: "pnpm add hosby-ts" },
      { file: "package-lock.json", command: "npm install hosby-ts" },
    ];

    let installer = "npm install hosby-ts";

    for (const lockFile of lockFiles) {
      if (fs.existsSync(lockFile.file)) {
        installer = lockFile.command;
        logger.debug(`Lock file found: ${lockFile.file}, using command: ${lockFile.command}`);
        break;
      }
    }

    logger.info(`Installing hosby-ts using: ${installer}`);
    execSync(installer, { stdio: "inherit" });
    spinner.succeed("hosby-ts installed successfully! 🎉 ");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    spinner.fail(`Failed to install hosby-ts: ${errorMessage}`);
    logger.error("Package installation failed", error);
    console.error("Please install hosby-ts manually: npm install hosby-ts");
  }
}
