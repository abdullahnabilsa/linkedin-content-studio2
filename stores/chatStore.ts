import create from 'zustand';

interface ChatState {
  conversation: any;
  messages: Array<any>;
  isSending: boolean;
  isStreaming: boolean;
  messageCount: number;
  totalTokens: number;
  setConversation: (conversation: any) => void;
  addMessage: (message: any) => void;
  updateLastMessage: (message: any) => void;
  setStreaming: (streaming: boolean) => void;
  setSending: (sending: boolean) => void;
  incrementMessageCount: () => void;
  addTokens: (tokens: number) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversation: null,
  messages: [],
  isSending: false,
  isStreaming: false,
  messageCount: 0,
  totalTokens: 0,
  setConversation: (conversation) => set({ conversation }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (message) => set((state) => {
    const messages = state.messages.slice();
    messages[messages.length - 1] = message;
    return { messages };
  }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setSending: (sending) => set({ isSending: sending }),
  incrementMessageCount: () => set((state) => ({ messageCount: state.messageCount + 1 })),
  addTokens: (tokens) => set((state) => ({ totalTokens: state.totalTokens + tokens })),
  clearChat: () => set({ messages: [], messageCount: 0, totalTokens: 0 }),
}));