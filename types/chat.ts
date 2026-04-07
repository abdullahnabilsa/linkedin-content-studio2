export type Conversation = {
  id: string;
  user_id: string;
  title: string;
  // other conversation fields
};

export type Message = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: Date;
};

export type MessageRole = 'user' | 'assistant' | 'system';