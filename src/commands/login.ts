import inquirer from "inquirer";
import { saveCredentials } from "../core/config.js";
import axios from "axios";
import { API_BASE_URL } from "../config/config.js";
import ora from "ora";

export async function login(): Promise<void> {
    const spinner = ora("Logging in...").start();

    try {
        // Stop spinner during prompt
        spinner.stop();

        const answers = await inquirer.prompt([
            { type: "input", name: "email", message: "Email Hosby :" },
            { type: "password", name: "cliToken", message: "Hosby CLI Token :" }
        ]);

        // Restart spinner after prompt
        spinner.start("Authenticating...");

        const response = await axios.post(`${API_BASE_URL}/auth/login`,
            JSON.stringify({
                email: answers.email,
                cliToken: answers.cliToken
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    "x-hosby-cli": "true"
                },
                timeout: 10000
            }
        );

        const { data } = response;

        if (!data.success) {
            throw new Error(data.message || 'Authentication failed');
        }

        const { sessionToken, userCliToken: cliToken, userId } = data.data;

        spinner.text = "Saving credentials...";
        await Promise.all([
            saveCredentials("hosby-session-token", sessionToken),
            saveCredentials("hosby-cli-token", cliToken),
            saveCredentials("hosby-user-id", userId.toString())
        ]);

        spinner.succeed("Successfully logged in! Your credentials are securely stored.");

    } catch (err: unknown) {
        spinner.fail("Login failed");
        if (axios.isAxiosError(err)) {
            console.error("❌ Authentication error:", err?.response?.data?.message || err?.message);
        } else {
            console.error("❌ Error during login:", (err as Error)?.message);
        }
        process.exit(1);
    }
}
