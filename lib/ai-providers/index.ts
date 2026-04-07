import { openaiProvider } from './openai';
import { openrouterProvider } from './openrouter';
import { groqProvider } from './groq';
import { anthropicProvider } from './anthropic';
import { geminiProvider } from './gemini';
import { togetherProvider } from './together';
import { mistralProvider } from './mistral';
import { AIProvider } from './types';

export function getProvider(platform: string): AIProvider {
    switch (platform) {
        case 'openai':
            return openaiProvider;
        case 'openrouter':
            return openrouterProvider;
        case 'groq':
            return groqProvider;
        case 'anthropic':
            return anthropicProvider;
        case 'gemini':
            return geminiProvider;
        case 'together':
            return togetherProvider;
        case 'mistral':
            return mistralProvider;
        default:
            throw new Error('Unknown platform');
    }
}