/**
 * AES-256-GCM Encryption Module
 * 
 * SERVER-SIDE ONLY — never import in client components.
 * All API keys are encrypted before storage and decrypted
 * only inside API routes or Cloudflare Workers.
 * 
 * Format: base64(IV[12 bytes] + AuthTag[16 bytes] + Ciphertext)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/** Length constants for AES-256-GCM */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Retrieves and validates the encryption key from environment variables.
 * The key must be exactly 32 characters (256 bits) for AES-256.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'It must be exactly 32 characters long.'
    );
  }
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly ${KEY_LENGTH} characters. ` +
      `Current length: ${key.length}`
    );
  }
  return Buffer.from(key, 'utf-8');
}

/**
 * Encrypts a plain text string using AES-256-GCM.
 * 
 * @param plainText - The raw API key or sensitive string to encrypt
 * @returns Base64-encoded string containing IV + AuthTag + Ciphertext
 * 
 * @example
 * ```ts
 * const encrypted = encrypt('sk-abc123...');
 * // Store `encrypted` in database
 * ```
 */
export function encrypt(plainText: string): string {
  if (!plainText || plainText.trim().length === 0) {
    throw new Error('Cannot encrypt empty or whitespace-only text');
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf-8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  /* Pack as: IV (12B) + AuthTag (16B) + Ciphertext (variable) */
  const combined = Buffer.concat([iv, authTag, encrypted]);

  return combined.toString('base64');
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * 
 * @param encryptedText - Base64-encoded string from encrypt()
 * @returns The original plain text API key
 * 
 * @example
 * ```ts
 * const apiKey = decrypt(row.encrypted_key);
 * // Use apiKey to call AI provider, then discard
 * ```
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || encryptedText.trim().length === 0) {
    throw new Error('Cannot decrypt empty or whitespace-only text');
  }

  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedText, 'base64');

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error(
      'Invalid encrypted data: too short to contain IV + AuthTag + Ciphertext'
    );
  }

  /* Extract IV, AuthTag, and Ciphertext from combined buffer */
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf-8');
}

/**
 * Validates that a string can be decrypted without errors.
 * Useful for health checks or migration scripts.
 */
export function isValidEncryptedString(encryptedText: string): boolean {
  try {
    decrypt(encryptedText);
    return true;
  } catch {
    return false;
  }
}