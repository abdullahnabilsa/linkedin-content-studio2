/**
 * Platform & Model Types
 * 
 * Type definitions for AI platforms and their models.
 */

/** Supported AI platforms */
export type PlatformId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'together'
  | 'mistral';

/** AI model returned from the models API */
export interface AIModel {
  /** Model identifier (e.g., "gpt-4o", "claude-3-5-sonnet-20241022") */
  id: string;
  /** Human-readable model name */
  name: string;
  /** Database ID (for global models) */
  dbId?: string;
  /** Sort order (for global models) */
  sortOrder?: number;
}

/** Platform configuration for display */
export interface PlatformConfig {
  id: PlatformId;
  name: string;
  icon: string;
  color: string;
  description: string;
  /** Whether this platform supports the /models endpoint */
  supportsModelListing: boolean;
}

/** All available platform configurations */
export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🟢',
    color: '#10A37F',
    description: 'GPT-4o, GPT-4, o1, and more',
    supportsModelListing: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🟤',
    color: '#D97757',
    description: 'Claude Sonnet 4, Claude 3.5, and more',
    supportsModelListing: false,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '🔵',
    color: '#4285F4',
    description: 'Gemini 2.5 Pro, Flash, and more',
    supportsModelListing: true,
  },
  {
    id: 'groq',
    name: 'Groq',
    icon: '⚡',
    color: '#F55036',
    description: 'Ultra-fast Llama, Mixtral inference',
    supportsModelListing: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: '🌐',
    color: '#6366F1',
    description: 'Access 200+ models via one API',
    supportsModelListing: true,
  },
  {
    id: 'together',
    name: 'Together AI',
    icon: '🤝',
    color: '#0EA5E9',
    description: 'Llama, Qwen, Mixtral, and more',
    supportsModelListing: true,
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    icon: '🔷',
    color: '#FF7000',
    description: 'Mistral Large, Medium, Small',
    supportsModelListing: true,
  },
];