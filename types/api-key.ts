/**
 * API Key Types
 * 
 * Type definitions for API key management throughout the application.
 */

/** Supported AI platforms */
export type ApiKeyPlatform =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'together'
  | 'mistral';

/** API key as stored in database (encrypted_key never exposed to client) */
export interface ApiKey {
  id: string;
  platform: ApiKeyPlatform | string;
  label: string;
  is_active: boolean;
  is_global: boolean;
  last_used_at: string | null;
  created_at: string;
  /** User ID — null for global keys */
  user_id?: string | null;
}

/** API key with encrypted key (server-side only) */
export interface ApiKeyWithSecret extends ApiKey {
  encrypted_key: string;
}

/** Request body for creating an API key */
export interface CreateApiKeyRequest {
  platform: ApiKeyPlatform;
  key: string;
  label: string;
  isGlobal?: boolean;
}

/** Request body for updating an API key */
export interface UpdateApiKeyRequest {
  id: string;
  label?: string;
  key?: string;
  is_active?: boolean;
}

/** API key validation result */
export interface ApiKeyValidation {
  isValid: boolean;
  message: string;
}