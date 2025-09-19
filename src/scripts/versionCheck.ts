import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

interface VersionInfo {
  latest: string;
  current: string;
  updateAvailable: boolean;
  releaseNotes?: string;
  downloadUrl?: string;
}

/**
 * Checks if a new version of the CLI is available
 * @returns {Promise<VersionInfo>} Version information
 */
export async function checkForUpdates(): Promise<VersionInfo> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJsonPath = path.resolve(__dirname, "../../package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const currentVersion = packageJson.version;

    // Check latest version from npm registry
    const response = await axios.get("https://registry.npmjs.org/hosby-cli", {
      timeout: 3000,
    });

    const latestVersion = response.data["dist-tags"]?.latest || currentVersion;
    const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;

    return {
      latest: latestVersion,
      current: currentVersion,
      updateAvailable,
      downloadUrl: "https://www.npmjs.com/package/hosby-cli",
      releaseNotes: updateAvailable
        ? `See release notes at: https://github.com/hosby/hosby-cli/releases/tag/v${latestVersion}`
        : undefined,
    };
  } catch (error) {
    return {
      latest: "unknown",
      current: "current",
      updateAvailable: false,
    };
  }
}

/**
 * Displays update notification if a new version is available
 */
export async function notifyIfUpdateAvailable(): Promise<void> {
  try {
    const versionInfo = await checkForUpdates();

    if (versionInfo.updateAvailable) {
      console.log("\n┌" + "─".repeat(60) + "┐");
      console.log("│" + " ".repeat(60) + "│");
      console.log(
        `│  🚀 Update available! ${versionInfo.current} → ${versionInfo.latest}`.padEnd(61) + "│"
      );
      console.log(`│  Run 'npm install -g hosby-cli' to update`.padEnd(61) + "│");
      console.log("│" + " ".repeat(60) + "│");
      console.log("└" + "─".repeat(60) + "┘\n");
    }
  } catch (error) {
    // Silently ignore errors during update check
  }
}

/**
 * Compares two version strings
 * @param {string} v1 - First version
 * @param {string} v2 - Second version
 * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}
