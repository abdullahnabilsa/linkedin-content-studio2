/**
 * Platform Display Names & Icons
 * 
 * Used across the application for consistent platform branding.
 * Merged into utils/constants.ts — import from there.
 */

/** Human-readable platform names */
export const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  together: 'Together AI',
  mistral: 'Mistral AI',
};

/** Emoji icons for platforms (used where SVG icons aren't available) */
export const PLATFORM_ICONS: Record<string, string> = {
  openai: '🟢',
  anthropic: '🟤',
  gemini: '🔵',
  groq: '⚡',
  openrouter: '🌐',
  together: '🤝',
  mistral: '🔷',
};

/** Platform colors for UI accents */
export const PLATFORM_COLORS: Record<string, string> = {
  openai: '#10A37F',
  anthropic: '#D97757',
  gemini: '#4285F4',
  groq: '#F55036',
  openrouter: '#6366F1',
  together: '#0EA5E9',
  mistral: '#FF7000',
};

/** Maximum API keys per plan */
export const MAX_API_KEYS = {
  free: 2,
  premium: 20,
  admin: 100,
} as const;

/** API key format validation patterns */
export const API_KEY_PATTERNS: Record<string, { prefix: string; minLength: number; description: string }> = {
  openai: { prefix: 'sk-', minLength: 20, description: 'Starts with sk-' },
  anthropic: { prefix: 'sk-ant-', minLength: 20, description: 'Starts with sk-ant-' },
  gemini: { prefix: '', minLength: 10, description: 'Google AI API key' },
  groq: { prefix: 'gsk_', minLength: 20, description: 'Starts with gsk_' },
  openrouter: { prefix: 'sk-or-', minLength: 20, description: 'Starts with sk-or-' },
  together: { prefix: '', minLength: 20, description: 'Together AI API key' },
  mistral: { prefix: '', minLength: 20, description: 'Mistral AI API key' },
};