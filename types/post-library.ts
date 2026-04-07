export type PostStatus = 'draft' | 'ready' | 'published' | 'archived';

export interface LibraryPost {
  id: string;
  user_id: string;
  content: string;
  title: string;
  status: PostStatus;
  persona_name: string | null;
  model_name: string | null;
  format_template: string | null;
  scheduled_date: string | null;
  source_conversation_id: string | null;
  source_message_id: string | null;
  created_at: string;
  updated_at: string;
}