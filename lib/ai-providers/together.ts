import { AIProvider, AIMessage } from './types';

const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
const AUTH_TOKEN = 'Bearer YOUR_TOGETHER_API_KEY';

export const togetherProvider: AIProvider = {
    name: 'Together',
    async sendMessage(messages: AIMessage[]) {
        const request = this.buildRequest(messages);
        const response = await fetch(request);
        return this.parseStream(response.body);
    },
    buildRequest(messages: AIMessage[]) {
        return new Request(TOGETHER_API_URL, {
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