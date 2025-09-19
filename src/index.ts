#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Command } from "commander";

import { notifyIfUpdateAvailable } from "./scripts/versionCheck.js";
import { getConfig, LogLevel } from "./config/config.js";
import logger, { setLogLevel } from "./helpers/logger.js";
import { createService } from "./commands/create-service.js";
import { config } from "./commands/config.js";
import { login } from "./commands/login.js";
import { scan } from "./commands/scan.js";
import { push } from "./commands/push.js";
import { pull } from "./commands/pull.js";
import { ai } from "./commands/ai.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

const program = new Command();

program
  .name("hosby")
  .description("Hosby CLI - Fast API generator for front-end, mobile and desktop projects")
  .version(packageJson.version);

program.command("login").description("Log in to your Hosby account").action(login);
program
  .command("scan [path]")
  .description("Scan project and generate schema")
  .option("--ai", "Use AI to generate schema (recommended)")
  .option("--timeout <ms>", "Timeout for AI operations in milliseconds", parseInt)
  .action((path = ".", options) => scan(path, options));
program
  .command("push")
  .description("Push local schema to Hosby server")
  .option("-f, --force", "Force push even if schema is unchanged")
  .action(options => push(options.force));
program.command("pull").description("Pull latest schema from Hosby server").action(pull);
program.command("ai").description("Configure/Analyse project via AI").action(ai);
program
  .command("create-service [tableName]")
  .description("Generate a CRUD service for a specific table")
  .action(async tableName => {
    await createService(tableName);
  });
program
  .command("config [type]")
  .description("Configure Hosby CLI (type: project, ai)")
  .action(config);

program
  .option("--debug", "Enable debug logging")
  .option("--quiet", "Minimize output (error logs only)")
  .hook("preAction", thisCommand => {
    if (thisCommand.opts().debug) {
      setLogLevel(LogLevel.DEBUG);
      logger.debug("Debug logging enabled");
    } else if (thisCommand.opts().quiet) {
      setLogLevel(LogLevel.ERROR);
      logger.debug("Quiet mode enabled");
    }
  });

(async () => {
  const config = getConfig();
  if (config.checkForUpdates !== false) {
    await notifyIfUpdateAvailable();
  }
  program.parse(process.argv);
})().catch(err => {
  logger.error("Error running Hosby CLI", err);
  process.exit(1);
});
