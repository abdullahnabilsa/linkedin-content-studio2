import { AIProvider, AIMessage } from './types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const AUTH_TOKEN = 'Bearer sk-or-...';

export const openrouterProvider: AIProvider = {
    name: 'OpenRouter',
    async sendMessage(messages: AIMessage[]) {
        const request = this.buildRequest(messages);
        const response = await fetch(request);
        return this.parseStream(response.body);
    },
    buildRequest(messages: AIMessage[]) {
        return new Request(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': AUTH_TOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages }),
        });
    },
    async parseStream(stream) {
        // Implement SSE parsing logic here
        return [];
    },
    async getModels() {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        return response.json();
    },
};