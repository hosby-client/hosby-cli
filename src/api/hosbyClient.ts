import { HosbyClient } from "hosby-ts";

class HosbyQuery {
  private readonly _client: HosbyClient;
  private isInitialized = false;

  constructor() {
    this._client = new HosbyClient({
      baseURL: process.env.HOSBY_BASE_URL || "",
      privateKey: process.env.HOSBY_PRIVATE_KEY || "",
      apiKeyId: process.env.HOSBY_API_KEY_ID || "",
      projectName: process.env.HOSBY_PROJECT_NAME || "",
      projectId: process.env.HOSBY_PROJECT_ID || "",
      userId: process.env.HOSBY_USER_ID || "",
    });

    this.initialize().catch(error => {
      console.error("Failed to initialize Hosby client:", error);
      throw new Error("Hosby client initialization failed");
    });
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this._client.init();
      this.isInitialized = true;
      console.log("Hosby client initialized successfully");
    } catch (error) {
      console.error("Error initializing Hosby client:", error);
      throw new Error("Failed to initialize Hosby client. Check your connection and credentials.");
    }
  }

  public get client(): HosbyClient {
    if (!this.isInitialized) {
      throw new Error("Hosby client not initialized. Ensure the service is loaded before use.");
    }
    return this._client;
  }
}

export const hosbyQuery = new HosbyQuery().client;
