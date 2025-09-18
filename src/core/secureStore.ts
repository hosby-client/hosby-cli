import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const HOSBY_DIR = path.join(os.homedir(), ".hosby");
const STORE_FILE = path.join(HOSBY_DIR, "credentials.json");
const ALGO = "aes-256-gcm";
const SECRET = process.env.HOSBY_SECRET || "change-this-secret";

/**
 * Set a key-value pair to the secure store.
 * @param key The key to save.
 * @param value The value to save.
 */
export function setKey(key: string, value: string): void {

  if (!fs.existsSync(HOSBY_DIR)) fs.mkdirSync(HOSBY_DIR, { recursive: true });

  let store: Record<string, { iv: string; tag: string; value: string }> = {};
  if (fs.existsSync(STORE_FILE)) {
    try {
      store = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
    } catch (error) {
      // If file exists but can't be parsed, start with empty store
      console.error('Error parsing credentials file:', error);
    }
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, crypto.scryptSync(SECRET, "salt", 32), iv);
  let encrypted = cipher.update(value, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  store[key] = { iv: iv.toString("hex"), tag, value: encrypted };
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}


/**
 * Get a value from the secure store.
 * @param key The key to get.
 * @returns The value associated with the key, or null if the key does not exist.
 */
export function getKey(key: string): string | null {
  if (!fs.existsSync(STORE_FILE)) return null;
  let store: Record<string, { iv: string; tag: string; value: string }>;
  try {
    store = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
  } catch (error) {
    return null;
  }

  const data = store[key];
  if (!data) return null;

  const iv = Buffer.from(data.iv, "hex");
  const tag = Buffer.from(data.tag, "hex");
  const decipher = crypto.createDecipheriv(ALGO, crypto.scryptSync(SECRET, "salt", 32), iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(data.value, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Remove a key from the secure store.
 * @param key The key to remove.
 */
export function removeKey(key: string): void {
  if (!fs.existsSync(STORE_FILE)) return;
  let store: Record<string, { iv: string; tag: string; value: string }>;
  try {
    store = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
  } catch (error) {
    return;
  }

  delete store[key];
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}
