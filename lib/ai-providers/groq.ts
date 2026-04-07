import { AIProvider, AIMessage } from './types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AUTH_TOKEN = 'Bearer gsk_...';

export const groqProvider: AIProvider = {
    name: 'Groq',
    async sendMessage(messages: AIMessage[]) {
        const request = this.buildRequest(messages);
        const response = await fetch(request);
        return this.parseStream(response.body);
    },
    buildRequest(messages: AIMessage[]) {
        return new Request(GROQ_API_URL, {
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
        // Implement model fetching logic here
        return [];
    },
};