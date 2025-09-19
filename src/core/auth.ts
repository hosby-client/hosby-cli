import { getCredentials } from "./config.js";
import { AuthCredentials } from "../types/types.js";

/**
 * Verifies if the user is logged in and returns authentication credentials
 * @throws {Error} If the user is not logged in or credentials are incomplete
 * @returns {Promise<AuthCredentials>} Authentication credentials
 */
export async function requireLogin(): Promise<AuthCredentials> {
  try {
    const cliToken = await getCredentials("hosby-cli-token");
    const userId = await getCredentials("hosby-user-id");
    const sessionToken = await getCredentials("hosby-session-token");

    if (!cliToken || !userId || !sessionToken) {
      console.error("\n⚠️  You must be logged in to perform this action.");
      console.error("Please run `hosby login` first.\n");
      process.exit(1);
    }

    return { cliToken, userId, sessionToken };
  } catch (err) {
    console.error("\n❌ Error accessing credentials.");
    console.error("Please run `hosby login` first.\n");
    process.exit(1);
  }
}

/**
 * Creates authorization headers for API requests
 * @param {AuthCredentials} credentials - User authentication credentials
 * @returns {object} Headers object for axios requests
 */
export function createAuthHeaders(credentials: AuthCredentials): object {
  return {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials.sessionToken}`,
      "x-hosby-cli": true,
      "x-hosby-user-id": credentials.userId,
    },
  };
}
