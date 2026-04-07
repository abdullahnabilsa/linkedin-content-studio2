export interface AIProvider {
    name: string;
    sendMessage: (messages: AIMessage[], config: ProviderConfig) => Promise<StreamChunk>;
    buildRequest: (messages: AIMessage[], config: ProviderConfig) => Request;
    parseStream: (stream: ReadableStream<Uint8Array>) => Promise<AIMessage[]>;
    getModels: () => Promise<string[]>;
}

export type ProviderConfig = {
    apiKey: string;
    model?: string;
};

export type StreamChunk = {
    content: string;
    isFinal: boolean;
};

export type AIMessage = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};