export type User = {
  id: string;
  email: string;
  display_name?: string;
  role: 'admin' | 'premium' | 'free';
  is_super_admin: boolean;
  premium_expires_at?: Date;
  is_banned: boolean;
  onboarding_completed: boolean;
  profile_completion_percent: number;
  preferred_language: string;
  preferred_theme: string;
  created_at: Date;
  updated_at: Date;
};

export type Profile = {
  id: string;
  user_id: string;
  // other profile fields
};

export type UserRole = 'admin' | 'premium' | 'free';