import { setKey, getKey, removeKey } from "./secureStore.js";
import path from "path";
import fs from "fs";
import { HosbySchema, ProjectCredentials } from "../types/types.js";

/**
 * Saves a key-value pair to the secure store
 * @param {string} name - The key to save
 * @param {string} value - The value to save
 */
export async function saveCredentials(name: string, value: string): Promise<void> {
  setKey(name, value);
}

/**
 * Gets a value from the secure store
 * @param {string} name - The key to get
 * @returns {string | null} The value associated with the key, or null if the key does not exist
 */
export async function getCredentials(name: string): Promise<string | null> {
  return getKey(name);
}

/**
 * Removes a key from the secure store
 * @param {string} name - The key to remove
 */
export async function removeCredentials(name: string): Promise<void> {
  return removeKey(name);
}

/**
 * Sets project informations in the schema file
 * @param {string} projectId - Project ID
 * @param {string} projectName - Project name
 */
export async function setProjectInfos(projectId: string, projectName: string): Promise<void> {
  try {
    const schemaPath = path.join(process.cwd(), "hosby.schema.json");
    let schema: HosbySchema = {
      tables: {},
    };

    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, "utf8");
      schema = JSON.parse(content);
    }

    schema.metadata = schema.metadata || {};
    schema.metadata.project = {
      id: projectId,
      name: projectName,
    };

    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
  } catch (error: unknown) {
    throw new Error(`Failed to save project info: ${(error as Error).message}`);
  }
}

/**
 * Gets project information from the schema file
 * @returns {ProjectCredentials} Project credentials including ID and name
 */
export async function getProjectInfos(): Promise<ProjectCredentials> {
  try {
    const schemaPath = path.join(process.cwd(), "hosby.schema.json");
    const schemaContent = fs.readFileSync(schemaPath, "utf8");
    const schema: HosbySchema = JSON.parse(schemaContent);
    const projectInfo = (schema?.metadata?.project as Record<string, string>) || {
      id: "",
      name: "",
    };

    return {
      id: projectInfo.id,
      name: projectInfo.name,
    };
  } catch {
    return {
      id: "",
      name: "",
    };
  }
}
