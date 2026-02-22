/**
 * Field-level encryption for sensitive database fields (e.g., LDAP bind passwords).
 *
 * Uses AES-256-GCM with a key derived from AUTH_SECRET.
 * Encrypted values are stored as: "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required for field encryption");
  }
  // Derive a 32-byte key from the secret using SHA-256
  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a plaintext value.
 * Returns the encrypted string in the format "enc:v1:<iv>:<authTag>:<ciphertext>".
 */
export function encryptField(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${PREFIX}${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted value.
 * If the value is not encrypted (no prefix), returns it as-is (backward compatible).
 */
export function decryptField(encryptedValue: string): string {
  if (!encryptedValue) return encryptedValue;

  // Not encrypted - return as-is for backward compatibility
  if (!encryptedValue.startsWith(PREFIX)) {
    return encryptedValue;
  }

  const key = getEncryptionKey();
  const parts = encryptedValue.slice(PREFIX.length).split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted field format");
  }

  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if a value is already encrypted.
 */
export function isEncrypted(value: string): boolean {
  return value?.startsWith(PREFIX) ?? false;
}
