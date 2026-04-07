/**
 * API Key Validation Functions
 * 
 * Validates API key format per platform.
 * Merged into utils/validators.ts — import from there.
 */

import { API_KEY_PATTERNS } from '@/utils/constants';

interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Validates an API key format for a given platform.
 * Does NOT verify the key against the platform API —
 * only checks the format/prefix.
 */
export function validateApiKey(key: string, platform: string): ValidationResult {
  const trimmedKey = key.trim();

  if (!trimmedKey) {
    return { isValid: false, message: 'API key cannot be empty' };
  }

  if (trimmedKey.length < 8) {
    return { isValid: false, message: 'API key is too short' };
  }

  if (trimmedKey.length > 500) {
    return { isValid: false, message: 'API key is too long' };
  }

  /* Check for common mistakes */
  if (trimmedKey.includes(' ')) {
    return { isValid: false, message: 'API key should not contain spaces' };
  }

  const pattern = API_KEY_PATTERNS[platform];

  if (!pattern) {
    /* Unknown platform — accept any key format */
    return { isValid: true, message: 'Valid' };
  }

  /* Check minimum length */
  if (trimmedKey.length < pattern.minLength) {
    return {
      isValid: false,
      message: `API key for ${platform} should be at least ${pattern.minLength} characters`,
    };
  }

  /* Check prefix (if specified) */
  if (pattern.prefix && !trimmedKey.startsWith(pattern.prefix)) {
    return {
      isValid: false,
      message: `API key for ${platform} should start with "${pattern.prefix}"`,
    };
  }

  return { isValid: true, message: 'Valid' };
}

/**
 * Masks an API key for display purposes.
 * Shows first 4 and last 4 characters.
 */
export function maskApiKey(key: string): string {
  if (key.length <= 12) {
    return key.substring(0, 4) + '****';
  }
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}